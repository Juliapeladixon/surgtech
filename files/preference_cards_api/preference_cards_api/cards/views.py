from django.contrib.auth import get_user_model
from django.contrib.auth.models import update_last_login
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Prefetch, Q
from django.utils import timezone
from django_filters import rest_framework as filters
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers as drf_serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from .exceptions import Conflict, InvalidCredentials
from .models import (
    CardAttachment,
    CardNote,
    Doctor,
    PreferenceCard,
    PreferenceCardItem,
    Procedure,
    Specialty,
    Surgeon,
    SurgicalInstrument,
    SurgicalPack,
    Suture,
)
from .serializers import (
    CardAttachmentSerializer,
    CardDetailSerializer,
    CardItemSerializer,
    CardListSerializer,
    CardNoteSerializer,
    CardWriteSerializer,
    ChangePasswordSerializer,
    DoctorSerializer,
    LoginSerializer,
    ProcedureSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    SpecialtySerializer,
    SurgeonSerializer,
    SurgicalInstrumentSerializer,
    SurgicalPackSerializer,
    SutureSerializer,
    UserSerializer,
)

User = get_user_model()


def request_user(request):
    """The logged-in user if a valid token was sent, else None (endpoints stay open)."""
    user = getattr(request, "user", None)
    return user if user is not None and user.is_authenticated else None


class CardsUnderMixin:
    """
    Provides a paginated GET of PreferenceCards, shaped by CardContextSerializer,
    for use as a sub-resource of Doctor / Procedure / Specialty.
    Subclasses override `filter_cards_for_parent`.
    """

    def filter_cards_for_parent(self, parent, qs):
        """Apply the parent-specific filter to `qs`. Override in each viewset."""
        raise NotImplementedError

    def _render_cards(self, qs):
        from .serializers import CardContextSerializer

        page = self.paginate_queryset(qs)
        serializer = CardContextSerializer(
            page if page is not None else qs,
            many=True,
            context=self.get_serializer_context(),
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    def _cards_queryset(self, include_deleted=False):
        qs = PreferenceCard.objects.all() if include_deleted else PreferenceCard.objects.alive()
        return (
            qs.select_related(
                "surgeon__doctor__specialty",
                "procedure__specialty",
                "compiled_by",
                "verified_by",
            )
            .prefetch_related(
                Prefetch("items", queryset=PreferenceCardItem.objects.all() if include_deleted else PreferenceCardItem.objects.alive()),
                Prefetch("notes", queryset=CardNote.objects.all() if include_deleted else CardNote.objects.alive()),
                Prefetch("attachments", queryset=CardAttachment.objects.all() if include_deleted else CardAttachment.objects.alive()),
            )
            .order_by("surgeon__display_name", "procedure__name", "id")
        )

    def _list_cards_for_parent(self, parent):
        mode = self.request.query_params.get("deleted", "exclude")

        if mode == "only":
            qs = self._cards_queryset(include_deleted=True).filter(deleted_at__isnull=False)
        elif mode == "include":
            qs = self._cards_queryset(include_deleted=True)
        else:
            qs = self._cards_queryset(include_deleted=False)

        qs = self.filter_cards_for_parent(parent, qs)

        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        return self._render_cards(qs)


# ═════════════════════════════════════════════════════════════════════════════
#  Accounts and authentication
# ═════════════════════════════════════════════════════════════════════════════
def _find_user(identifier):
    """Look a user up by username, falling back to email."""
    user = User.objects.filter(username__iexact=identifier).first()
    if user is None:
        matches = User.objects.filter(email__iexact=identifier)
        user = matches.first() if matches.count() == 1 else None
    return user


def _issue_token(user):
    token, _ = Token.objects.get_or_create(user=user)
    return token.key


class RegisterView(APIView):
    """Create an account. Returns a token so the new user is signed in straight away."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=RegisterSerializer, responses={201: inline_serializer('RegisterResponse', {'message': drf_serializers.CharField(), 'token': drf_serializers.CharField(), 'user': UserSerializer()})})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "message": "Account created.",
                "token": _issue_token(user),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=LoginSerializer, responses={200: inline_serializer('LoginResponse', {'message': drf_serializers.CharField(), 'token': drf_serializers.CharField(), 'must_change_password': drf_serializers.BooleanField(), 'user': UserSerializer()})})
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = _find_user(serializer.validated_data["username"])
        if user is None or not user.check_password(serializer.validated_data["password"]):
            raise InvalidCredentials("Invalid username or password.")
        if not user.is_active:
            return Response(
                {
                    "status_code": 403,
                    "error": "account_disabled",
                    "message": "This account has been deactivated. Contact an administrator.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        update_last_login(None, user)
        return Response(
            {
                "message": "Login successful.",
                "token": _issue_token(user),
                "must_change_password": user.must_change_password,
                "user": UserSerializer(user).data,
            }
        )


class LogoutView(APIView):
    """Invalidates the caller's token. Needs 'Authorization: Token <key>'."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=None, responses={200: inline_serializer('LogoutResponse', {'message': drf_serializers.CharField()})})
    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({"message": "Logged out. The token is no longer valid."})


class MeView(APIView):
    """The signed-in user's own profile. Needs 'Authorization: Token <key>'."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses=UserSerializer)
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    @extend_schema(request=ProfileUpdateSerializer, responses=ProfileUpdateSerializer)
    def patch(self, request):
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    """
    Change a password by proving the old one (works with or without a token).
    Clears must_change_password and rotates the token.
    """

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=ChangePasswordSerializer, responses={200: inline_serializer('ChangePasswordResponse', {'message': drf_serializers.CharField(), 'token': drf_serializers.CharField()})})
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = _find_user(data["username"])
        if user is None or not user.check_password(data["old_password"]):
            raise InvalidCredentials("Invalid username or old password.")
        try:
            validate_password(data["new_password"], user)
        except DjangoValidationError as exc:
            raise ValidationError({"new_password": list(exc.messages)})
        user.set_password(data["new_password"])
        user.must_change_password = False
        user.save()
        Token.objects.filter(user=user).delete()
        return Response(
            {"message": "Password changed.", "token": _issue_token(user)},
        )


class UserViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    Manage users. Accounts are created through /auth/register/, so there is no POST /users/.
    DELETE deactivates (is_active=false) rather than removing the row.
    """

    # `hospital` FK removed in v1.4 — no select_related, no filterset entry.
    queryset = User.objects.order_by("username")
    serializer_class = UserSerializer
    http_method_names = ["get", "patch", "delete", "post", "head", "options"]  # no PUT
    filterset_fields = ["role", "job_title", "is_active"]
    search_fields = ["username", "first_name", "last_name", "email"]

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=["is_active"])
        Token.objects.filter(user=user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        """Admin reset: sets a new password and forces a change at next login."""
        user = self.get_object()
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            validate_password(serializer.validated_data["new_password"], user)
        except DjangoValidationError as exc:
            raise ValidationError({"new_password": list(exc.messages)})
        user.set_password(serializer.validated_data["new_password"])
        user.must_change_password = True
        user.save()
        Token.objects.filter(user=user).delete()
        return Response({"message": f"Password reset for {user.username}. They must change it at next login."})


# ═════════════════════════════════════════════════════════════════════════════
#  Shared behaviour for every soft-deletable table
# ═════════════════════════════════════════════════════════════════════════════
class SoftDeleteViewSet(viewsets.ModelViewSet):
    """
    * DELETE  -> soft delete (sets deleted_at), 204. 409 if other live rows depend on it.
    * POST .../restore/ -> undo a soft delete.
    * ?deleted=exclude (default) | include | only   on list and detail.
    """

    def get_queryset(self):
        qs = super().get_queryset()
        mode = self.request.query_params.get("deleted", "exclude")
        if self.action == "restore" or mode == "include":
            return qs
        if mode == "only":
            return qs.filter(deleted_at__isnull=False)
        return qs.alive()

    def get_delete_blockers(self, obj):
        """Return human-readable reasons this row cannot be deleted (override per model)."""
        return []

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.is_deleted:
            raise ValidationError("This record is already deleted.")
        blockers = self.get_delete_blockers(obj)
        if blockers:
            raise Conflict("Cannot delete: still in use by " + ", ".join(blockers) + ".")
        obj.soft_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def check_restore(self, obj):
        """Hook: raise Conflict if restoring would break a rule."""

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        obj = self.get_object()
        if not obj.is_deleted:
            raise ValidationError("This record is not deleted, so there is nothing to restore.")
        self.check_restore(obj)
        obj.deleted_at = None
        obj.save()
        return self.restore_response(obj)

    def restore_response(self, obj):
        return Response(self.get_serializer(obj).data)


def _plural(n, word):
    return f"{n} {word}{'' if n == 1 else 's'}"


def _item_usage(source, pk):
    return PreferenceCardItem.objects.alive().filter(
        item_source=source, item_id=pk, card__deleted_at__isnull=True
    ).count()


# ═════════════════════════════════════════════════════════════════════════════
#  Directory
#  NOTE: HospitalViewSet was removed in v1.4 together with the Hospital model.
# ═════════════════════════════════════════════════════════════════════════════
class SpecialtyViewSet(CardsUnderMixin, SoftDeleteViewSet):
    queryset = Specialty.objects.all()
    serializer_class = SpecialtySerializer
    filterset_fields = ["is_active"]
    search_fields = ["name", "short_code"]

    def get_delete_blockers(self, obj):
        out = []
        if (n := obj.doctors.alive().count()):
            out.append(_plural(n, "doctor"))
        if (n := obj.procedures.alive().count()):
            out.append(_plural(n, "procedure"))
        return out

    @action(detail=True, methods=["get"], url_path="doctors")
    def doctors(self, request, pk=None):
        """
        GET /specialties/{id}/doctors/
        Doctors in this specialty.
        Optional: ?has_surgeon=true to only return doctors that have a Surgeon profile.
        """
        specialty = self.get_object()
        qs = (
            Doctor.objects.alive()
            .filter(specialty=specialty)
            .select_related("specialty")
            .order_by("doctor_name")
        )
        if request.query_params.get("has_surgeon", "").lower() in ("1", "true", "yes"):
            qs = qs.filter(surgeon__isnull=False)

        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(DoctorSerializer(page, many=True).data)
        return Response(DoctorSerializer(qs, many=True).data)

    def filter_cards_for_parent(self, parent, qs):
        # A card is "in" a specialty if either the procedure or the surgeon's doctor belongs to it.
        return qs.filter(
            Q(procedure__specialty=parent)
            | Q(surgeon__doctor__specialty=parent)
        )

    @action(detail=True, methods=["get"], url_path="cards")
    def cards(self, request, pk=None):
        """GET /specialties/{id}/cards/ — cards whose procedure or surgeon belongs to this specialty."""
        return self._list_cards_for_parent(self.get_object())


class DoctorViewSet(CardsUnderMixin, SoftDeleteViewSet):
    queryset = Doctor.objects.select_related("specialty")
    serializer_class = DoctorSerializer
    filterset_fields = ["specialty", "city", "is_group_practice"]
    search_fields = ["doctor_name", "title", "sub_specialty", "practice_or_hospital", "city"]

    def get_delete_blockers(self, obj):
        return (
            ["a surgeon profile (delete that first)"]
            if Surgeon.objects.alive().filter(doctor=obj).exists()
            else []
        )

    @action(detail=True, methods=["get"], url_path="procedures")
    def procedures(self, request, pk=None):
        """
        GET /doctors/{id}/procedures/
        Procedures belonging to the doctor's specialty.
        Optional: ?used=true to only return procedures this doctor has a card for.
        """
        doctor = self.get_object()
        qs = (
            Procedure.objects.alive()
            .filter(specialty=doctor.specialty)
            .select_related("specialty")
            .order_by("name")
        )

        if request.query_params.get("used", "").lower() in ("1", "true", "yes"):
            surgeon = getattr(doctor, "surgeon", None)
            if surgeon is None:
                qs = qs.none()
            else:
                qs = qs.filter(
                    cards__surgeon=surgeon, cards__deleted_at__isnull=True
                ).distinct()

        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(ProcedureSerializer(page, many=True).data)
        return Response(ProcedureSerializer(qs, many=True).data)

    def filter_cards_for_parent(self, parent, qs):
        # `parent` is a Doctor; cards link via Surgeon.doctor
        return qs.filter(surgeon__doctor=parent)

    @action(detail=True, methods=["get"], url_path="cards")
    def cards(self, request, pk=None):
        """GET /doctors/{id}/cards/ — every preference card for this doctor."""
        return self._list_cards_for_parent(self.get_object())


class SurgeonFilter(filters.FilterSet):
    specialty = filters.NumberFilter(field_name="doctor__specialty")

    class Meta:
        model = Surgeon
        fields = ["doctor", "specialty"]


class SurgeonViewSet(SoftDeleteViewSet):
    queryset = Surgeon.objects.select_related("doctor__specialty")
    serializer_class = SurgeonSerializer
    filterset_class = SurgeonFilter
    search_fields = ["display_name", "doctor__doctor_name"]

    def get_delete_blockers(self, obj):
        n = obj.cards.alive().count()
        return [_plural(n, "card")] if n else []


class ProcedureViewSet(CardsUnderMixin, SoftDeleteViewSet):
    queryset = Procedure.objects.select_related("specialty")
    serializer_class = ProcedureSerializer
    filterset_fields = ["specialty"]
    search_fields = ["name", "aliases"]

    def get_delete_blockers(self, obj):
        n = obj.cards.alive().count()
        return [_plural(n, "card")] if n else []

    def filter_cards_for_parent(self, parent, qs):
        return qs.filter(procedure=parent)

    @action(detail=True, methods=["get"], url_path="cards")
    def cards(self, request, pk=None):
        """GET /procedures/{id}/cards/ — every preference card for this procedure."""
        return self._list_cards_for_parent(self.get_object())


# ═════════════════════════════════════════════════════════════════════════════
#  Item lists
# ═════════════════════════════════════════════════════════════════════════════
class SutureViewSet(SoftDeleteViewSet):
    queryset = Suture.objects.all()
    serializer_class = SutureSerializer
    filterset_fields = ["material", "size", "item_type", "needle_type", "is_absorbable"]
    search_fields = ["material", "size", "item_type", "needle_type"]

    def get_delete_blockers(self, obj):
        n = _item_usage("suture", obj.pk)
        return [_plural(n, "card")] if n else []


class SurgicalInstrumentViewSet(SoftDeleteViewSet):
    queryset = SurgicalInstrument.objects.all()
    serializer_class = SurgicalInstrumentSerializer
    filterset_fields = ["category", "is_reusable", "condition_status"]
    search_fields = ["name", "category", "type_or_variant"]

    def get_delete_blockers(self, obj):
        n = _item_usage("instrument", obj.pk)
        return [_plural(n, "card")] if n else []


class SurgicalPackViewSet(SoftDeleteViewSet):
    queryset = SurgicalPack.objects.all()
    serializer_class = SurgicalPackSerializer
    filterset_fields = ["pack_type", "is_reusable"]
    search_fields = ["pack_name", "pack_type", "contents_description"]

    def get_delete_blockers(self, obj):
        n = _item_usage("pack", obj.pk)
        return [_plural(n, "card")] if n else []


# ═════════════════════════════════════════════════════════════════════════════
#  Preference cards
# ═════════════════════════════════════════════════════════════════════════════
class CardFilter(filters.FilterSet):
    specialty = filters.NumberFilter(field_name="procedure__specialty")
    review_due_before = filters.DateFilter(field_name="review_due_on", lookup_expr="lte")
    review_due_after = filters.DateFilter(field_name="review_due_on", lookup_expr="gte")

    doctor = filters.NumberFilter(field_name="surgeon__doctor_id")

    class Meta:
        model = PreferenceCard
        fields = [
            "surgeon", "doctor", "procedure", "specialty",
            "status", "anaesthesia_type", "compiled_by", "verified_by",
        ]


class CardViewSet(SoftDeleteViewSet):
    queryset = PreferenceCard.objects.select_related(
        "surgeon__doctor__specialty", "procedure__specialty", "compiled_by", "verified_by"
    )
    filterset_class = CardFilter
    search_fields = [
        "card_title", "procedure__name", "procedure__aliases",
        "surgeon__display_name", "surgeon__doctor__doctor_name",
    ]

    def get_serializer_class(self):
        if self.action == "list":
            return CardListSerializer
        if self.action in ("create", "update", "partial_update"):
            return CardWriteSerializer
        return CardDetailSerializer

    @staticmethod
    def _with_children(qs):
        return qs.prefetch_related(
            Prefetch("items", queryset=PreferenceCardItem.objects.alive()),
            Prefetch("notes", queryset=CardNote.objects.alive()),
            Prefetch("attachments", queryset=CardAttachment.objects.alive()),
        )

    def _detail_queryset(self):
        return self._with_children(PreferenceCard.objects.select_related(
            "surgeon__doctor__specialty", "procedure__specialty", "compiled_by", "verified_by"
        ))

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == "list":
            return qs.annotate(
                item_count=Count("items", filter=Q(items__deleted_at__isnull=True))
            ).order_by("surgeon__display_name", "procedure__name", "id")
        return self._with_children(qs)

    # -- create / update return the full card ---------------------------------
    def _detail(self, card):
        card = self._detail_queryset().get(pk=card.pk)
        return CardDetailSerializer(card, context=self.get_serializer_context()).data

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request_user(request)
        card = serializer.save(created_by=user, updated_by=user)
        return Response(self._detail(card), status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(
            instance, data=request.data, partial=kwargs.pop("partial", False)
        )
        serializer.is_valid(raise_exception=True)
        user = request_user(request)
        card = serializer.save(**({"updated_by": user} if user else {}))
        return Response(self._detail(card))

    # -- workflow actions -----------------------------------------------------
    @action(detail=True, methods=["post"])
    def verify(self, request, pk=None):
        """
        Mark the card as checked. Sets status=ACTIVE, verified_at=now and verified_by.
        Body (only needed when no token is sent): {"verified_by": <user id>}
        """
        card = self.get_object()
        if card.status == PreferenceCard.Status.ARCHIVED:
            raise ValidationError("Archived cards cannot be verified. Un-archive it first.")
        verifier = request_user(request)
        if verifier is None:
            verifier_id = request.data.get("verified_by")
            if not verifier_id:
                raise ValidationError(
                    {"verified_by": "Required when the request has no auth token."}
                )
            verifier = User.objects.filter(pk=verifier_id, is_active=True).first()
            if verifier is None:
                raise ValidationError({"verified_by": f"No active user with ID {verifier_id}."})
        card.status = PreferenceCard.Status.ACTIVE
        card.verified_by = verifier
        card.verified_at = timezone.now()
        card.updated_by = verifier
        card.save()
        return Response(self._detail(card))

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        """Retire the card (frees the surgeon+procedure slot for a newer card)."""
        card = self.get_object()
        if card.status == PreferenceCard.Status.ARCHIVED:
            raise ValidationError("This card is already archived.")
        card.status = PreferenceCard.Status.ARCHIVED
        user = request_user(request)
        if user:
            card.updated_by = user
        card.save()
        return Response(self._detail(card))

    def check_restore(self, obj):
        if obj.status != PreferenceCard.Status.ARCHIVED:
            clash = (
                PreferenceCard.objects.alive()
                .exclude(status=PreferenceCard.Status.ARCHIVED)
                .filter(surgeon=obj.surgeon, procedure=obj.procedure)
                .exclude(pk=obj.pk)
                .first()
            )
            if clash:
                raise Conflict(
                    f"Cannot restore: card #{clash.pk} is now the live card for this "
                    f"surgeon and procedure. Archive it first."
                )

    def restore_response(self, obj):
        return Response(self._detail(obj))

    @action(detail=False, methods=["get"], url_path="by-context")
    def by_context(self, request):
        """
        GET /cards/by-context/?doctor=<id>&procedure=<id>&specialty=<id>

        Any combination of the three is accepted. Each returned card carries
        nested `doctor` (with hospital), `procedure`, and `items`
        (resolved sutures / instruments / packs).
        """
        from .serializers import CardContextSerializer  # local import to avoid a cycle

        qs = (
            PreferenceCard.objects.alive()
            .select_related(
                "surgeon__doctor__specialty",
                "procedure__specialty",
                "compiled_by",
                "verified_by",
            )
            .prefetch_related(
                Prefetch("items", queryset=PreferenceCardItem.objects.alive()),
                Prefetch("notes", queryset=CardNote.objects.alive()),
                Prefetch("attachments", queryset=CardAttachment.objects.alive()),
            )
            .order_by("surgeon__display_name", "procedure__name", "id")
        )

        doctor_id    = request.query_params.get("doctor")
        procedure_id = request.query_params.get("procedure")
        specialty_id = request.query_params.get("specialty")
        status_param = request.query_params.get("status")

        if doctor_id:
            qs = qs.filter(surgeon__doctor_id=doctor_id)
        if procedure_id:
            qs = qs.filter(procedure_id=procedure_id)
        if specialty_id:
            # A card is "in" a specialty if either the procedure or the
            # surgeon's doctor belongs to it.
            qs = qs.filter(
                Q(procedure__specialty_id=specialty_id)
                | Q(surgeon__doctor__specialty_id=specialty_id)
            )
        if status_param:
            qs = qs.filter(status=status_param)

        # Honour the same ?deleted=exclude|include|only convention as the base class
        mode = request.query_params.get("deleted", "exclude")
        if mode == "only":
            qs = qs.filter(deleted_at__isnull=False)
        elif mode == "include":
            # .alive() already filtered; include anything soft-deleted as well
            qs = PreferenceCard.objects.filter(
                Q(pk__in=qs.values("pk")) | Q(deleted_at__isnull=False)
            ).select_related(
                "surgeon__doctor__specialty", "procedure__specialty"
            ).prefetch_related(
                Prefetch("items", queryset=PreferenceCardItem.objects.all()),
                Prefetch("notes", queryset=CardNote.objects.all()),
                Prefetch("attachments", queryset=CardAttachment.objects.all()),
            )

        page = self.paginate_queryset(qs)
        serializer = CardContextSerializer(
            page if page is not None else qs,
            many=True,
            context=self.get_serializer_context(),
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)


# ═════════════════════════════════════════════════════════════════════════════
#  Card children
# ═════════════════════════════════════════════════════════════════════════════
class CardChildViewSet(SoftDeleteViewSet):
    """Items / notes / attachments only show while their parent card is alive."""

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("deleted", "exclude") == "exclude":
            qs = qs.filter(card__deleted_at__isnull=True)
        return qs.select_related("card")


class CardItemViewSet(CardChildViewSet):
    queryset = PreferenceCardItem.objects.all()
    serializer_class = CardItemSerializer
    filterset_fields = ["card", "item_source", "item_id"]
    search_fields = ["item_notes"]


class CardNoteViewSet(CardChildViewSet):
    queryset = CardNote.objects.all()
    serializer_class = CardNoteSerializer
    filterset_fields = ["card", "note_type"]
    search_fields = ["body"]

    def perform_create(self, serializer):
        serializer.save(created_by=request_user(self.request))


class CardAttachmentViewSet(CardChildViewSet):
    """Upload with multipart/form-data: card, file, caption, attachment_type."""

    queryset = CardAttachment.objects.all()
    serializer_class = CardAttachmentSerializer
    filterset_fields = ["card", "attachment_type"]
    search_fields = ["file_name", "caption"]

    def perform_create(self, serializer):
        serializer.save(uploaded_by=request_user(self.request))