from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

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

User = get_user_model()

HOUSEKEEPING = ("created_at", "updated_at", "deleted_at", "row_version")


class BaseModelSerializer(serializers.ModelSerializer):
    """Foreign-key inputs only accept rows that have not been soft-deleted."""

    def get_fields(self):
        fields = super().get_fields()
        for field in fields.values():
            qs = getattr(field, "queryset", None)
            if (
                isinstance(field, serializers.PrimaryKeyRelatedField)
                and qs is not None
                and hasattr(qs, "alive")
            ):
                field.queryset = qs.alive()
        return fields


# ─────────────────────────────────────────────────────────────────────────────
#  Users and authentication
# ─────────────────────────────────────────────────────────────────────────────
def _check_unique_email(email, exclude_pk=None):
    if email:
        qs = User.objects.filter(email__iexact=email)
        if exclude_pk:
            qs = qs.exclude(pk=exclude_pk)
        if qs.exists():
            raise serializers.ValidationError("A user with this email already exists.")
    return email


class UserSerializer(serializers.ModelSerializer):
    can_edit = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", "email", "phone",
            "job_title", "role", "can_edit",
            "must_change_password", "is_active", "date_joined", "last_login",
        ]
        read_only_fields = [
            "id", "username", "date_joined", "last_login", "must_change_password",
        ]

    def validate_email(self, value):
        return _check_unique_email(value, self.instance.pk if self.instance else None)


class ProfileUpdateSerializer(UserSerializer):
    """What a user may change about themselves via PATCH /auth/me/."""

    class Meta(UserSerializer.Meta):
        # Username is editable on self-service profile (with uniqueness check).
        read_only_fields = [
            "id", "date_joined", "last_login", "must_change_password",
            "role", "is_active",
        ]

    def validate_username(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Username is required.")
        qs = User.objects.filter(username__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("That username is already taken.")
        return value


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    password_confirm = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = [
            "username", "password", "password_confirm", "email", "first_name",
            "last_name", "phone", "job_title", "role",
        ]
        extra_kwargs = {"email": {"required": False}}

    def validate_email(self, value):
        return _check_unique_email(value)

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        candidate = User(**{k: v for k, v in attrs.items() if k != "password"})
        try:
            validate_password(attrs["password"], candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(
            password=password, must_change_password=False, **validated_data
        )


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(help_text="Username or email address")
    password = serializers.CharField(style={"input_type": "password"})


class ChangePasswordSerializer(serializers.Serializer):
    username = serializers.CharField(help_text="Username or email address")
    old_password = serializers.CharField()
    new_password = serializers.CharField()
    new_password_confirm = serializers.CharField()

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "Passwords do not match."})
        return attrs


class ResetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField()


# ─────────────────────────────────────────────────────────────────────────────
#  Directory
# ─────────────────────────────────────────────────────────────────────────────
class SpecialtySerializer(BaseModelSerializer):
    class Meta:
        model = Specialty
        fields = "__all__"
        read_only_fields = HOUSEKEEPING


class DoctorSerializer(BaseModelSerializer):
    specialty_name = serializers.CharField(source="specialty.name", read_only=True)
    is_surgeon = serializers.SerializerMethodField()

    class Meta:
        model = Doctor
        fields = "__all__"
        read_only_fields = HOUSEKEEPING

    def get_is_surgeon(self, obj) -> bool:
        return Surgeon.objects.alive().filter(doctor=obj).exists()


class SurgeonSerializer(BaseModelSerializer):
    doctor_name = serializers.CharField(source="doctor.doctor_name", read_only=True)
    specialty = serializers.IntegerField(source="doctor.specialty_id", read_only=True)
    specialty_name = serializers.CharField(source="doctor.specialty.name", read_only=True)

    class Meta:
        model = Surgeon
        fields = "__all__"
        read_only_fields = HOUSEKEEPING


class ProcedureSerializer(BaseModelSerializer):
    specialty_name = serializers.CharField(source="specialty.name", read_only=True)

    class Meta:
        model = Procedure
        fields = "__all__"
        read_only_fields = HOUSEKEEPING


# ─────────────────────────────────────────────────────────────────────────────
#  Item lists
# ─────────────────────────────────────────────────────────────────────────────
class SutureSerializer(BaseModelSerializer):
    label = serializers.CharField(source="__str__", read_only=True)

    class Meta:
        model = Suture
        fields = "__all__"
        read_only_fields = HOUSEKEEPING


class SurgicalInstrumentSerializer(BaseModelSerializer):
    label = serializers.CharField(source="__str__", read_only=True)

    class Meta:
        model = SurgicalInstrument
        fields = "__all__"
        read_only_fields = HOUSEKEEPING


class SurgicalPackSerializer(BaseModelSerializer):
    label = serializers.CharField(source="__str__", read_only=True)

    class Meta:
        model = SurgicalPack
        fields = "__all__"
        read_only_fields = HOUSEKEEPING


ITEM_SERIALIZERS = {
    PreferenceCardItem.Source.SUTURE: SutureSerializer,
    PreferenceCardItem.Source.INSTRUMENT: SurgicalInstrumentSerializer,
    PreferenceCardItem.Source.PACK: SurgicalPackSerializer,
}


# ─────────────────────────────────────────────────────────────────────────────
#  Card parts
# ─────────────────────────────────────────────────────────────────────────────
class ItemReferenceMixin:
    """item_source + item_id is a soft reference, so check it here (mirrors model.clean())."""

    def validate(self, attrs):
        if "item_source" in attrs or "item_id" in attrs:
            inst = getattr(self, "instance", None)
            source = attrs.get("item_source", inst.item_source if inst else None)
            item_id = attrs.get("item_id", inst.item_id if inst else None)
            model = PreferenceCardItem.SOURCE_MODELS.get(source)
            if model and item_id and not model.objects.alive().filter(pk=item_id).exists():
                raise serializers.ValidationError(
                    {"item_id": f"No {source} with ID {item_id}."}
                )
        return attrs


class CardItemInputSerializer(ItemReferenceMixin, serializers.ModelSerializer):
    """Used inside 'items': [...] when creating a whole card in one request."""

    class Meta:
        model = PreferenceCardItem
        fields = ["item_source", "item_id", "quantity", "item_notes"]
        extra_kwargs = {"quantity": {"min_value": 1}}


class CardItemSerializer(ItemReferenceMixin, BaseModelSerializer):
    item_label = serializers.SerializerMethodField()
    item_detail = serializers.SerializerMethodField()

    class Meta:
        model = PreferenceCardItem
        fields = "__all__"
        read_only_fields = HOUSEKEEPING
        extra_kwargs = {"quantity": {"min_value": 1}}

    def get_item_label(self, obj) -> str:
        item = obj.item
        return str(item) if item else f"{obj.item_source} #{obj.item_id} (missing)"

    def get_item_detail(self, obj) -> dict | None:
        item = obj.item
        return ITEM_SERIALIZERS[obj.item_source](item).data if item else None


class CardNoteInputSerializer(serializers.ModelSerializer):
    class Meta:
        model = CardNote
        fields = ["note_type", "body", "sort_order"]
        extra_kwargs = {"sort_order": {"required": False}}


class CardNoteSerializer(BaseModelSerializer):
    class Meta:
        model = CardNote
        fields = "__all__"
        read_only_fields = HOUSEKEEPING + ("created_by",)


class CardAttachmentSerializer(BaseModelSerializer):
    class Meta:
        model = CardAttachment
        fields = "__all__"
        read_only_fields = HOUSEKEEPING + (
            "file_name", "mime_type", "file_size_bytes", "uploaded_by",
        )

    def validate(self, attrs):
        if self.instance and ("file" in attrs or "card" in attrs):
            raise serializers.ValidationError(
                "The file and card cannot be changed. Delete this attachment and upload a new one."
            )
        return attrs

    def create(self, validated_data):
        upload = validated_data.get("file")
        validated_data["mime_type"] = getattr(upload, "content_type", "") or ""
        return super().create(validated_data)


# ─────────────────────────────────────────────────────────────────────────────
#  The preference card
# ─────────────────────────────────────────────────────────────────────────────
class CardListSerializer(serializers.ModelSerializer):
    """Compact row for lists and search results."""

    title = serializers.CharField(read_only=True)
    surgeon_name = serializers.CharField(source="surgeon.display_name", read_only=True)
    procedure_name = serializers.CharField(source="procedure.name", read_only=True)
    specialty = serializers.IntegerField(source="procedure.specialty_id", read_only=True)
    specialty_name = serializers.CharField(source="procedure.specialty.name", read_only=True)
    item_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = PreferenceCard
        fields = [
            "id", "title", "card_title", "surgeon", "surgeon_name", "procedure",
            "procedure_name", "specialty", "specialty_name", "status", "version_no",
            "anaesthesia_type", "card_date", "review_due_on", "item_count", "updated_at",
        ]


class CardDetailSerializer(serializers.ModelSerializer):
    """Full card, with items, notes and attachments nested (read-only)."""

    title = serializers.CharField(read_only=True)
    effective_glove_size = serializers.CharField(read_only=True)
    surgeon_name = serializers.CharField(source="surgeon.display_name", read_only=True)
    procedure_name = serializers.CharField(source="procedure.name", read_only=True)
    specialty = serializers.IntegerField(source="procedure.specialty_id", read_only=True)
    specialty_name = serializers.CharField(source="procedure.specialty.name", read_only=True)
    compiled_by_name = serializers.StringRelatedField(source="compiled_by", read_only=True)
    verified_by_name = serializers.StringRelatedField(source="verified_by", read_only=True)
    items = serializers.SerializerMethodField()
    notes = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()

    class Meta:
        model = PreferenceCard
        fields = "__all__"

    def get_items(self, obj) -> list:
        return CardItemSerializer(obj.items.all(), many=True, context=self.context).data

    def get_notes(self, obj) -> list:
        return CardNoteSerializer(obj.notes.all(), many=True, context=self.context).data

    def get_attachments(self, obj) -> list:
        return CardAttachmentSerializer(obj.attachments.all(), many=True, context=self.context).data


class CardWriteSerializer(BaseModelSerializer):
    """
    Create / update a card. On create you may also send 'items' and 'notes'
    arrays to build the whole card in one request.
    """

    items = CardItemInputSerializer(many=True, required=False, write_only=True)
    notes = CardNoteInputSerializer(many=True, required=False, write_only=True)

    class Meta:
        model = PreferenceCard
        fields = "__all__"
        read_only_fields = HOUSEKEEPING + (
            "created_by", "updated_by", "verified_by", "verified_at",
        )
        validators = []  # the one-live-card rule is checked in validate() below

    def validate(self, attrs):
        inst = self.instance
        if inst and ("items" in attrs or "notes" in attrs):
            raise serializers.ValidationError(
                "Items and notes can only be sent when creating a card. "
                "To change them use /api/card-items/ and /api/card-notes/."
            )
        surgeon = attrs.get("surgeon", inst.surgeon if inst else None)
        procedure = attrs.get("procedure", inst.procedure if inst else None)
        status = attrs.get("status", inst.status if inst else PreferenceCard.Status.DRAFT)
        if surgeon and procedure and status != PreferenceCard.Status.ARCHIVED:
            clash = (
                PreferenceCard.objects.alive()
                .exclude(status=PreferenceCard.Status.ARCHIVED)
                .filter(surgeon=surgeon, procedure=procedure)
            )
            if inst:
                clash = clash.exclude(pk=inst.pk)
            existing = clash.first()
            if existing:
                raise serializers.ValidationError(
                    f"A live card already exists for this surgeon and procedure "
                    f"(card #{existing.pk}). Edit that card, or archive it first."
                )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items = validated_data.pop("items", [])
        notes = validated_data.pop("notes", [])
        card = PreferenceCard.objects.create(**validated_data)
        PreferenceCardItem.objects.bulk_create(
            [PreferenceCardItem(card=card, **item) for item in items]
        )
        CardNote.objects.bulk_create(
            [
                CardNote(
                    card=card,
                    created_by=validated_data.get("created_by"),
                    **{**note, "sort_order": note.get("sort_order", idx)},
                )
                for idx, note in enumerate(notes, start=1)
            ]
        )
        return card


# ─────────────────────────────────────────────────────────────────────────────
#  Contextual card views (doctor / procedure / specialty aware)
#  NOTE: these are defined ONCE. Do not re-define at the bottom of the file —
#  the previous duplication shadowed the hospital-free version.
# ─────────────────────────────────────────────────────────────────────────────
class ResolvedCardItemSerializer(serializers.ModelSerializer):
    """A PreferenceCardItem with its polymorphic target resolved inline."""
    item_label = serializers.SerializerMethodField()
    item_detail = serializers.SerializerMethodField()

    class Meta:
        model = PreferenceCardItem
        fields = [
            "card_item_id", "item_source", "item_id",
            "quantity", "item_notes", "item_label", "item_detail",
        ]

    def get_item_label(self, obj) -> str:
        item = obj.item
        return str(item) if item else f"{obj.item_source} #{obj.item_id} (missing)"

    def get_item_detail(self, obj) -> dict | None:
        item = obj.item
        if item is None:
            return None
        cls = ITEM_SERIALIZERS.get(obj.item_source)
        return cls(item, context=self.context).data if cls else None


class DoctorBriefSerializer(serializers.ModelSerializer):
    """Doctor payload used inside CardContextSerializer."""
    specialty = serializers.SerializerMethodField()
    hospital = serializers.SerializerMethodField()
    is_surgeon = serializers.SerializerMethodField()
    surgeon_display_name = serializers.SerializerMethodField()

    class Meta:
        model = Doctor
        fields = [
            "doctor_id", "title", "doctor_name",
            "sub_specialty", "practice_or_hospital", "city",
            "phone_primary", "phone_secondary", "is_group_practice",
            "specialty", "hospital", "is_surgeon", "surgeon_display_name",
        ]

    def get_specialty(self, obj):
        if not obj.specialty_id:
            return None
        return {"id": obj.specialty_id, "name": obj.specialty.name,
                "short_code": obj.specialty.short_code}

    def get_hospital(self, obj) -> dict | None:
        """
        Hospital is no longer a model. Doctor stores the free-text
        `practice_or_hospital`; expose that as the hospital payload so
        clients keep the same response shape.
        """
        if not obj.practice_or_hospital:
            return None
        return {
            "id": None,
            "name": obj.practice_or_hospital,
            "short_code": None,
            "city": obj.city or None,
        }

    def get_is_surgeon(self, obj) -> bool:
        return Surgeon.objects.alive().filter(doctor=obj).exists()

    def get_surgeon_display_name(self, obj):
        surgeon = getattr(obj, "surgeon", None)
        return surgeon.display_name if surgeon else None


class ProcedureBriefSerializer(serializers.ModelSerializer):
    specialty = serializers.SerializerMethodField()

    class Meta:
        model = Procedure
        fields = ["id", "name", "aliases", "specialty"]

    def get_specialty(self, obj):
        if not obj.specialty_id:
            return None
        return {"id": obj.specialty_id, "name": obj.specialty.name,
                "short_code": obj.specialty.short_code}


class CardContextSerializer(serializers.ModelSerializer):
    """
    Card payload with:
        doctor     -> doctor info (+ specialty + hospital + surgeon name)
        procedure  -> procedure info (+ specialty)
        items      -> resolved sutures / instruments / packs for the same card
    """
    title = serializers.CharField(read_only=True)
    effective_glove_size = serializers.CharField(read_only=True)
    doctor = serializers.SerializerMethodField()
    procedure = ProcedureBriefSerializer(read_only=True)
    items = serializers.SerializerMethodField()
    notes = CardNoteSerializer(many=True, read_only=True)
    attachments = CardAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = PreferenceCard
        fields = [
            "id", "title", "card_title", "status", "version_no",
            "patient_position", "position_aids", "anaesthesia_type",
            "glove_size", "effective_glove_size", "skin_prep",
            "diathermy_settings", "estimated_minutes",
            "card_date", "review_due_on",
            "doctor", "procedure", "items", "notes", "attachments",
            "updated_at",
        ]

    def get_doctor(self, obj) -> dict:
        data = DoctorBriefSerializer(
            obj.surgeon.doctor, context=self.context
        ).data
        data["surgeon_id"] = obj.surgeon_id
        data["surgeon_display_name"] = obj.surgeon.display_name
        return data

    def get_items(self, obj) -> list:
        return ResolvedCardItemSerializer(
            obj.items.all(), many=True, context=self.context
        ).data