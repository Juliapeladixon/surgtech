"""
Surgical Preference Cards App — Django models
Database design v1.4 (21 October 2026) · Xyten Technologies

13 tables (was 13, now 12 — Hospital removed):
  Access ........ users
  Directory ..... specialties, doctors, surgeons, procedures
  Card .......... preference_cards, preference_card_items, card_notes, card_attachments
  Item lists .... sutures, surgical_instruments, surgical_packs

Settings required:  AUTH_USER_MODEL = "cards.User"
Target database:    PostgreSQL (partial unique index on cards needs it; SQLite also works for dev)

Change log v1.4:
  * Removed the `hospitals` table and the `User.hospital` FK.
    Doctor.practice_or_hospital (free text) is now the only hospital-like field.
  * Migrations required (in this order):
      1. RemoveField(model_name="user", name="hospital")
      2. DeleteModel(name="Hospital")
    See migrations/ for the exact files.
"""

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone


# ─────────────────────────────────────────────────────────────────────────────
#  Shared housekeeping columns (every table in the design carries these)
# ─────────────────────────────────────────────────────────────────────────────
class AliveQuerySet(models.QuerySet):
    def alive(self):
        """Rows that have not been soft-deleted."""
        return self.filter(deleted_at__isnull=True)

    def soft_delete(self):
        return self.update(deleted_at=timezone.now())


class TimeStamped(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(
        null=True, blank=True
    )  # soft delete: hidden, not destroyed
    row_version = models.PositiveIntegerField(default=1)  # bumps on every save

    objects = AliveQuerySet.as_manager()

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if self.pk:
            self.row_version += 1
        super().save(*args, **kwargs)

    def soft_delete(self):
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at", "row_version", "updated_at"])

    @property
    def is_deleted(self):
        return self.deleted_at is not None


# ─────────────────────────────────────────────────────────────────────────────
#  ACCESS — users only. The old `Hospital` table has been removed.
# ─────────────────────────────────────────────────────────────────────────────
class User(AbstractUser):
    """Theatre staff who log in. Django handles password hashing (password_hash)."""

    class JobTitle(models.TextChoices):
        RGN = "RGN", "Registered General Nurse"
        OTN = "OTN", "Operating Theatre Nurse"
        SCRUB_NURSE = "SCRUB_NURSE", "Scrub Nurse"
        HCA = "HCA", "Health Care Assistant"
        ANAESTHETIC_NURSE = "ANAESTHETIC_NURSE", "Anaesthetic Nurse"
        OTHER = "OTHER", "Other"

    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"  # manage users, restore deleted cards
        EDITOR = "EDITOR", "Editor"  # create and update cards
        VIEWER = "VIEWER", "Viewer"  # read, search, print — cannot change anything

    # NOTE: `hospital` FK was removed in v1.4. See Doctor.practice_or_hospital
    # for the free-text field that replaced it.

    job_title = models.CharField(max_length=30, choices=JobTitle.choices, blank=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.VIEWER)
    phone = models.CharField(max_length=30, blank=True)
    must_change_password = models.BooleanField(default=True)

    class Meta:
        db_table = "users"

    @property
    def can_edit(self):
        return self.role in (self.Role.ADMIN, self.Role.EDITOR)

    def __str__(self):
        return self.get_full_name() or self.username


# ─────────────────────────────────────────────────────────────────────────────
#  DIRECTORY — specialties → doctors → surgeons, and procedures
# ─────────────────────────────────────────────────────────────────────────────
class Specialty(TimeStamped):
    name = models.CharField(max_length=100, unique=True)  # 'ENT Surgery' … 16 rows
    short_code = models.CharField(max_length=20, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "specialties"
        ordering = ["sort_order", "name"]
        verbose_name_plural = "specialties"

    def __str__(self):
        return self.name


class Doctor(TimeStamped):
    """Personal and contact details. `practice_or_hospital` replaces the old FK."""

    doctor_id = models.BigAutoField(primary_key=True)
    title = models.CharField(max_length=20, blank=True)  # Prof, Dr, Mr
    doctor_name = models.CharField(max_length=100)
    specialty = models.ForeignKey(
        Specialty, on_delete=models.PROTECT, related_name="doctors"
    )
    sub_specialty = models.CharField(max_length=100, blank=True)  # Paediatric ENT
    practice_or_hospital = models.CharField(max_length=150, blank=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=50, blank=True)
    phone_primary = models.CharField(
        max_length=30, blank=True
    )  # text keeps leading zeros
    phone_secondary = models.CharField(max_length=30, blank=True)
    is_group_practice = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "doctors"
        ordering = ["doctor_name"]
        indexes = [models.Index(fields=["doctor_name"])]

    def __str__(self):
        return f"{self.title} {self.doctor_name}".strip()


class Surgeon(TimeStamped):
    """Surgical details for a doctor who operates. Specialty comes through the doctor."""

    doctor = models.OneToOneField(
        Doctor, on_delete=models.PROTECT, related_name="surgeon"
    )
    display_name = models.CharField(
        max_length=100
    )  # as written on the card: 'Mr Machawira'
    glove_size = models.CharField(max_length=10, blank=True)  # '7½'
    general_notes = models.TextField(blank=True)  # habits that apply to every card

    class Meta:
        db_table = "surgeons"
        ordering = ["display_name"]

    @property
    def specialty(self):
        return self.doctor.specialty

    def __str__(self):
        return self.display_name


class Procedure(TimeStamped):
    """Stored once under its specialty and shared by every surgeon who performs it."""

    specialty = models.ForeignKey(
        Specialty, on_delete=models.PROTECT, related_name="procedures"
    )
    name = models.CharField(max_length=150)
    aliases = models.CharField(
        max_length=255, blank=True
    )  # 'VV strip; varicose vein stripping'

    class Meta:
        db_table = "procedures"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["specialty", "name"], name="uq_procedure_per_specialty"
            )
        ]

    def __str__(self):
        return self.name


# ─────────────────────────────────────────────────────────────────────────────
#  ITEM LISTS — what a card can call for (no stock quantities here)
# ─────────────────────────────────────────────────────────────────────────────
class Suture(TimeStamped):
    suture_id = models.BigAutoField(primary_key=True)
    material = models.CharField(max_length=50)  # Silk, Nylon, Prolene
    size = models.CharField(max_length=10)  # 0, 2/0, 3/0
    item_type = models.CharField(max_length=30)  # Tie, Needled suture
    needle_type = models.CharField(
        max_length=30, blank=True
    )  # Cutting, Round body, None
    needle_length_mm = models.PositiveIntegerField(null=True, blank=True)
    is_absorbable = models.BooleanField(default=False)
    expiry_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "sutures"
        ordering = ["material", "size"]

    def __str__(self):
        parts = [self.size, self.material, self.item_type]
        if self.needle_type and self.needle_type.lower() != "none":
            parts.append(self.needle_type)
        if self.needle_length_mm:
            parts.append(f"{self.needle_length_mm}mm")
        return " ".join(p for p in parts if p)


class SurgicalInstrument(TimeStamped):
    instrument_id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=50, blank=True)  # Forceps, Retractor, Clip
    type_or_variant = models.CharField(
        max_length=50, blank=True
    )  # Curved, Self-retaining
    is_reusable = models.BooleanField(default=True)
    condition_status = models.CharField(
        max_length=30, blank=True
    )  # Sterile, In use, Needs repair
    last_sterilized_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "surgical_instruments"
        ordering = ["name"]

    def __str__(self):
        return (
            f"{self.name} ({self.type_or_variant})"
            if self.type_or_variant
            else self.name
        )


class SurgicalPack(TimeStamped):
    pack_id = models.BigAutoField(primary_key=True)
    pack_name = models.CharField(max_length=100)
    pack_type = models.CharField(
        max_length=50, blank=True
    )  # Instrument tray, Gown pack
    contents_description = models.CharField(max_length=255, blank=True)
    is_reusable = models.BooleanField(default=False)
    sterile_until = models.DateField(null=True, blank=True)
    last_sterilized_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "surgical_packs"
        ordering = ["pack_name"]

    def __str__(self):
        return self.pack_name


# ─────────────────────────────────────────────────────────────────────────────
#  THE PREFERENCE CARD
# ─────────────────────────────────────────────────────────────────────────────
class PreferenceCard(TimeStamped):
    """One surgeon's preferences for one procedure (~1,000 cards)."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ACTIVE = "ACTIVE", "Active"
        UNDER_REVIEW = "UNDER_REVIEW", "Under review"
        ARCHIVED = "ARCHIVED", "Archived"

    class Anaesthesia(models.TextChoices):
        GA = "GA", "General"
        SPINAL = "SPINAL", "Spinal"
        EPIDURAL = "EPIDURAL", "Epidural"
        LOCAL = "LOCAL", "Local"
        SEDATION = "SEDATION", "Sedation"
        REGIONAL = "REGIONAL", "Regional"
        OTHER = "OTHER", "Other"

    surgeon = models.ForeignKey(Surgeon, on_delete=models.PROTECT, related_name="cards")
    procedure = models.ForeignKey(
        Procedure, on_delete=models.PROTECT, related_name="cards"
    )

    card_title = models.CharField(
        max_length=150, blank=True
    )  # overrides procedure name if set
    patient_position = models.CharField(max_length=100, blank=True)
    position_aids = models.CharField(max_length=255, blank=True)
    anaesthesia_type = models.CharField(
        max_length=10, choices=Anaesthesia.choices, blank=True
    )
    glove_size = models.CharField(
        max_length=10, blank=True
    )  # only if it differs from surgeon's
    skin_prep = models.CharField(max_length=100, blank=True)
    diathermy_settings = models.CharField(max_length=100, blank=True)
    estimated_minutes = models.PositiveIntegerField(null=True, blank=True)

    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.DRAFT
    )
    version_no = models.PositiveIntegerField(default=1)
    card_date = models.DateField(null=True, blank=True)  # date on the paper card
    review_due_on = models.DateField(null=True, blank=True)

    compiled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cards_compiled",
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cards_verified",
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cards_created",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cards_updated",
    )

    class Meta:
        db_table = "preference_cards"
        ordering = ["surgeon__display_name", "procedure__name"]
        constraints = [
            # one live card per surgeon + procedure (archived / deleted cards don't count)
            models.UniqueConstraint(
                fields=["surgeon", "procedure"],
                condition=Q(deleted_at__isnull=True) & ~Q(status="ARCHIVED"),
                name="uq_live_card_per_surgeon_procedure",
            ),
        ]

    @property
    def title(self):
        return self.card_title or self.procedure.name

    @property
    def effective_glove_size(self):
        return self.glove_size or self.surgeon.glove_size

    def __str__(self):
        return f"{self.surgeon} — {self.title}"


class PreferenceCardItem(TimeStamped):
    """
    One item on a card. item_source + item_id point at a row in sutures,
    surgical_instruments or surgical_packs. This is the ONLY table with a quantity.
    """

    class Source(models.TextChoices):
        SUTURE = "suture", "Suture"
        INSTRUMENT = "instrument", "Instrument"
        PACK = "pack", "Pack"

    SOURCE_MODELS = {
        Source.SUTURE: Suture,
        Source.INSTRUMENT: SurgicalInstrument,
        Source.PACK: SurgicalPack,
    }

    card_item_id = models.BigAutoField(primary_key=True)
    card = models.ForeignKey(
        PreferenceCard, on_delete=models.CASCADE, related_name="items"
    )
    item_source = models.CharField(max_length=10, choices=Source.choices)
    item_id = models.PositiveBigIntegerField()  # ID in the source table
    quantity = models.PositiveIntegerField(default=1)
    item_notes = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "preference_card_items"
        ordering = ["card_item_id"]
        indexes = [
            models.Index(fields=["item_source", "item_id"], name="idx_item_source_id")
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(item_source__in=["suture", "instrument", "pack"]),
                name="ck_item_source_valid",
            ),
            models.CheckConstraint(
                condition=Q(quantity__gte=1), name="ck_quantity_positive"
            ),
        ]

    # The database cannot enforce item_source + item_id as a foreign key,
    # so the app checks it here. Model forms and the admin call clean() automatically.
    def clean(self):
        model = self.SOURCE_MODELS.get(self.item_source)
        if model is None:
            raise ValidationError({"item_source": "Choose suture, instrument or pack."})
        if self.item_id and not model.objects.alive().filter(pk=self.item_id).exists():
            raise ValidationError(
                {"item_id": f"No {self.item_source} with ID {self.item_id}."}
            )

    @property
    def item(self):
        """The actual Suture / SurgicalInstrument / SurgicalPack row (or None)."""
        model = self.SOURCE_MODELS.get(self.item_source)
        return model.objects.filter(pk=self.item_id).first() if model else None

    def __str__(self):
        return f"{self.quantity} × {self.item or f'{self.item_source} #{self.item_id}'}"


class CardNote(TimeStamped):
    """The starred lines — printed in a warning box at the top of the card."""

    class NoteType(models.TextChoices):
        GENERAL = "GENERAL", "General"
        WARNING = "WARNING", "Warning"
        PREFERENCE = "PREFERENCE", "Preference"
        POSITIONING = "POSITIONING", "Positioning"
        POST_OP = "POST_OP", "Post-op"

    card = models.ForeignKey(
        PreferenceCard, on_delete=models.CASCADE, related_name="notes"
    )
    note_type = models.CharField(
        max_length=12, choices=NoteType.choices, default=NoteType.GENERAL
    )
    body = models.TextField()
    sort_order = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )

    class Meta:
        db_table = "card_notes"
        ordering = ["sort_order"]

    def __str__(self):
        return f"[{self.note_type}] {self.body[:40]}"


class CardAttachment(TimeStamped):
    """Positioning diagrams, tray photos, or a scan of the original paper card."""

    class AttachmentType(models.TextChoices):
        POSITIONING = "POSITIONING", "Positioning"
        TRAY_LAYOUT = "TRAY_LAYOUT", "Tray layout"
        ORIGINAL_CARD = "ORIGINAL_CARD", "Original card"
        OTHER = "OTHER", "Other"

    card = models.ForeignKey(
        PreferenceCard, on_delete=models.CASCADE, related_name="attachments"
    )
    file = models.FileField(upload_to="card_attachments/%Y/%m/")  # = storage_path
    file_name = models.CharField(max_length=255, blank=True)
    mime_type = models.CharField(max_length=100, blank=True)
    file_size_bytes = models.PositiveBigIntegerField(null=True, blank=True)
    caption = models.CharField(max_length=255, blank=True)
    attachment_type = models.CharField(
        max_length=14, choices=AttachmentType.choices, default=AttachmentType.OTHER
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )

    class Meta:
        db_table = "card_attachments"

    def save(self, *args, **kwargs):
        if self.file and not self.file_name:
            self.file_name = self.file.name.rsplit("/", 1)[-1]
        if self.file and self.file_size_bytes is None:
            try:
                self.file_size_bytes = self.file.size
            except Exception:
                pass
        super().save(*args, **kwargs)

    def __str__(self):
        return self.file_name or str(self.file)