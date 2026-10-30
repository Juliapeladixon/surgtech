from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import (
    CardAttachment, CardNote, Doctor, PreferenceCard, PreferenceCardItem,
    Procedure, Specialty, Surgeon, SurgicalInstrument, SurgicalPack, Suture, User,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Theatre profile", {"fields": ("job_title", "role", "phone", "must_change_password")}),
    )
    list_display = ("username", "first_name", "last_name", "role", "is_active")
    list_filter = ("role", "is_active")


for model in (
    Specialty, Doctor, Surgeon, Procedure, Suture, SurgicalInstrument,
    SurgicalPack, PreferenceCard, PreferenceCardItem, CardNote, CardAttachment,
):
    admin.site.register(model)