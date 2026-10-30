from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from rest_framework.test import APITestCase

from .models import PreferenceCard, Specialty, Suture, User


class Base(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_sample_data", verbosity=0)

    def card(self, surgeon="Dr Ncube", procedure="Laparoscopic cholecystectomy"):
        return PreferenceCard.objects.get(
            surgeon__display_name=surgeon, procedure__name=procedure, status="ACTIVE")


class AuthTests(Base):
    def test_register_login_me_logout(self):
        r = self.client.post("/api/auth/register/", {
            "username": "new_nurse", "password": "Sterile#Field9", "password_confirm": "Sterile#Field9",
            "email": "nn@example.org", "job_title": "RGN"}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertIn("token", r.data)
        self.assertEqual(r.data["user"]["role"], "VIEWER")
        self.assertNotIn("password", r.data["user"])

        r = self.client.post("/api/auth/login/", {"username": "new_nurse", "password": "Sterile#Field9"}, format="json")
        self.assertEqual(r.status_code, 200)
        token = r.data["token"]
        # login by email works too
        r2 = self.client.post("/api/auth/login/", {"username": "nn@example.org", "password": "Sterile#Field9"}, format="json")
        self.assertEqual(r2.status_code, 200)

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
        r = self.client.get("/api/auth/me/")
        self.assertEqual(r.data["username"], "new_nurse")
        r = self.client.patch("/api/auth/me/", {"phone": "0771", "role": "ADMIN"}, format="json")
        self.assertEqual(r.data["phone"], "0771")
        self.assertEqual(r.data["role"], "VIEWER")  # role not self-editable
        self.assertEqual(self.client.post("/api/auth/logout/").status_code, 200)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

    def test_register_errors(self):
        r = self.client.post("/api/auth/register/", {"username": "x", "password": "abc", "password_confirm": "abd"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data["error"], "validation_error")
        self.assertIn("password_confirm", r.data["details"])
        r = self.client.post("/api/auth/register/", {"username": "admin_chipo", "password": "Sterile#Field9", "password_confirm": "Sterile#Field9"}, format="json")
        self.assertIn("username", r.data["details"])
        r = self.client.post("/api/auth/register/", {"username": "weak", "password": "12345678", "password_confirm": "12345678"}, format="json")
        self.assertIn("password", r.data["details"])

    def test_login_failures(self):
        r = self.client.post("/api/auth/login/", {"username": "admin_chipo", "password": "wrong"}, format="json")
        self.assertEqual(r.status_code, 401)
        self.assertEqual(r.data["error"], "authentication_failed")
        User.objects.filter(username="viewer_rudo").update(is_active=False)
        r = self.client.post("/api/auth/login/", {"username": "viewer_rudo", "password": "Theatre#2026"}, format="json")
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.data["error"], "account_disabled")

    def test_unauthenticated_me(self):
        r = self.client.get("/api/auth/me/")
        self.assertEqual(r.status_code, 401)
        self.assertEqual(r.data["error"], "not_authenticated")

    def test_change_password_and_admin_reset(self):
        body = {"username": "viewer_rudo", "old_password": "Theatre#2026",
                "new_password": "Brand#New2027x", "new_password_confirm": "Brand#New2027x"}
        self.assertEqual(self.client.post("/api/auth/change-password/", body, format="json").status_code, 200)
        r = self.client.post("/api/auth/login/", {"username": "viewer_rudo", "password": "Brand#New2027x"}, format="json")
        self.assertEqual(r.status_code, 200)
        bad = dict(body, old_password="nope")
        self.assertEqual(self.client.post("/api/auth/change-password/", bad, format="json").status_code, 401)
        uid = User.objects.get(username="viewer_rudo").pk
        r = self.client.post(f"/api/users/{uid}/reset-password/", {"new_password": "Reset#Me2028x"}, format="json")
        self.assertEqual(r.status_code, 200)
        r = self.client.post("/api/auth/login/", {"username": "viewer_rudo", "password": "Reset#Me2028x"}, format="json")
        self.assertTrue(r.data["must_change_password"])

    def test_users_endpoints(self):
        self.assertEqual(self.client.get("/api/users/").data["count"], 5)
        self.assertEqual(self.client.post("/api/users/", {}, format="json").status_code, 405)
        uid = User.objects.get(username="viewer_rudo").pk
        self.assertEqual(self.client.patch(f"/api/users/{uid}/", {"role": "EDITOR"}, format="json").data["role"], "EDITOR")
        self.assertEqual(self.client.delete(f"/api/users/{uid}/").status_code, 204)
        self.assertFalse(User.objects.get(pk=uid).is_active)


class DirectoryTests(Base):
    def test_open_access_and_pagination(self):
        r = self.client.get("/api/specialties/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["count"], 16)
        r = self.client.get("/api/specialties/?page_size=5&page=2")
        self.assertEqual(len(r.data["results"]), 5)
        self.assertEqual(self.client.get("/api/specialties/?page=99").status_code, 404)

    def test_crud_soft_delete_restore(self):
        """
        Same coverage as the old /api/hospitals/ test, but on `Specialty`
        (a soft-deletable resource that still exists in v1.4).
        """
        r = self.client.post("/api/specialties/", {
            "name": "Test Surgery", "short_code": "TS",
        }, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        sid = r.data["id"]

        # `short_code` is not unique on Specialty, but `name` is — try a duplicate name.
        self.assertEqual(
            self.client.post("/api/specialties/", {"name": "Test Surgery"}, format="json").status_code,
            400,
        )

        self.assertEqual(
            self.client.patch(f"/api/specialties/{sid}/", {"short_code": "TS2"}, format="json").data["short_code"],
            "TS2",
        )
        self.assertEqual(self.client.delete(f"/api/specialties/{sid}/").status_code, 204)
        self.assertEqual(self.client.get(f"/api/specialties/{sid}/").status_code, 404)
        self.assertEqual(self.client.get("/api/specialties/?deleted=only").data["count"], 1)

        r = self.client.post(f"/api/specialties/{sid}/restore/")
        self.assertEqual(r.status_code, 200)
        self.assertIsNone(r.data["deleted_at"])

        # Second restore is a no-op error (already alive)
        self.assertEqual(self.client.post(f"/api/specialties/{sid}/restore/").status_code, 400)

        # Cleanup so the count-based tests later don't trip on this row
        self.client.delete(f"/api/specialties/{sid}/")

    def test_delete_blocked_when_in_use(self):
        r = self.client.delete("/api/specialties/1/")
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.data["error"], "conflict")
        s = Suture.objects.first()
        r = self.client.delete(f"/api/sutures/{s.pk}/")
        self.assertEqual(r.status_code, 409)

    def test_search_and_filter(self):
        r = self.client.get("/api/procedures/?search=VV strip")
        self.assertEqual([p["name"] for p in r.data["results"]], ["Varicose vein stripping"])
        r = self.client.get("/api/sutures/?is_absorbable=false")
        self.assertTrue(all(not s["is_absorbable"] for s in r.data["results"]))
        r = self.client.get("/api/surgeons/")
        self.assertEqual(r.data["count"], 6)
        self.assertIn("specialty_name", r.data["results"][0])

    def test_procedure_unique_per_specialty(self):
        r = self.client.post("/api/procedures/", {"specialty": 1, "name": "Tonsillectomy"}, format="json")
        self.assertEqual(r.status_code, 400)


class CardTests(Base):
    def test_list_and_detail(self):
        r = self.client.get("/api/cards/")
        self.assertEqual(r.data["count"], 10)
        self.assertIn("item_count", r.data["results"][0])
        c = self.card()
        d = self.client.get(f"/api/cards/{c.pk}/").data
        self.assertEqual(d["title"], "Laparoscopic cholecystectomy")
        self.assertEqual(d["effective_glove_size"], "8")
        self.assertEqual(len(d["items"]), 6)
        self.assertIn("item_label", d["items"][0])
        self.assertEqual(len(d["notes"]), 2)

    def test_filters_and_search(self):
        self.assertEqual(self.client.get("/api/cards/?status=ARCHIVED").data["count"], 1)
        self.assertEqual(self.client.get("/api/cards/?search=lap chole").data["count"], 1)
        self.assertGreaterEqual(self.client.get("/api/cards/?review_due_before=2000-01-01").data["count"], 0)
        self.assertEqual(self.client.get("/api/cards/?status=BOGUS").status_code, 400)

    def test_create_full_card_with_items_and_notes(self):
        suture = Suture.objects.first()
        r = self.client.post("/api/cards/", {
            "surgeon": self.card().surgeon_id,
            "procedure": PreferenceCard.objects.get(procedure__name="TURP").procedure_id,
            "anaesthesia_type": "GA",
            "items": [{"item_source": "suture", "item_id": suture.pk, "quantity": 2}],
            "notes": [{"note_type": "WARNING", "body": "Check allergies"}],
        }, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["status"], "DRAFT")
        self.assertEqual(len(r.data["items"]), 1)
        self.assertEqual(r.data["notes"][0]["sort_order"], 1)

    def test_one_live_card_rule(self):
        c = self.card()
        r = self.client.post("/api/cards/", {"surgeon": c.surgeon_id, "procedure": c.procedure_id}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("live card already exists", str(r.data["details"]))
        # an ARCHIVED duplicate is allowed
        r = self.client.post("/api/cards/", {"surgeon": c.surgeon_id, "procedure": c.procedure_id, "status": "ARCHIVED"}, format="json")
        self.assertEqual(r.status_code, 201)
        # un-archiving it is then refused
        r2 = self.client.patch(f"/api/cards/{r.data['id']}/", {"status": "ACTIVE"}, format="json")
        self.assertEqual(r2.status_code, 400)

    def test_bad_item_reference(self):
        c = self.card()
        r = self.client.post("/api/card-items/", {"card": c.pk, "item_source": "pack", "item_id": 99999}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("item_id", r.data["details"])
        r = self.client.post("/api/card-items/", {"card": c.pk, "item_source": "suture", "item_id": Suture.objects.first().pk, "quantity": 0}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("quantity", r.data["details"])

    def test_items_notes_crud(self):
        c = self.card()
        s = Suture.objects.first()
        r = self.client.post("/api/card-items/", {"card": c.pk, "item_source": "suture", "item_id": s.pk, "quantity": 3}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(self.client.get(f"/api/card-items/?card={c.pk}").data["count"], 7)
        self.assertEqual(self.client.delete(f"/api/card-items/{r.data['card_item_id']}/").status_code, 204)
        n = self.client.post("/api/card-notes/", {"card": c.pk, "body": "Extra note", "note_type": "POST_OP"}, format="json")
        self.assertEqual(n.status_code, 201)

    def test_patch_delete_restore_card(self):
        c = self.card()
        r = self.client.patch(f"/api/cards/{c.pk}/", {"estimated_minutes": 90}, format="json")
        self.assertEqual(r.data["estimated_minutes"], 90)
        self.assertGreater(r.data["row_version"], 1)
        self.assertEqual(self.client.delete(f"/api/cards/{c.pk}/").status_code, 204)
        self.assertEqual(self.client.get(f"/api/card-items/?card={c.pk}").data["count"], 0)
        self.assertEqual(self.client.get(f"/api/cards/{c.pk}/").status_code, 404)
        self.assertEqual(self.client.post(f"/api/cards/{c.pk}/restore/").status_code, 200)

    def test_restore_conflict(self):
        c = self.card()
        self.client.delete(f"/api/cards/{c.pk}/")
        self.client.post("/api/cards/", {"surgeon": c.surgeon_id, "procedure": c.procedure_id}, format="json")
        self.assertEqual(self.client.post(f"/api/cards/{c.pk}/restore/").status_code, 409)

    def test_verify_and_archive(self):
        c = PreferenceCard.objects.get(procedure__name="Grommet insertion")
        r = self.client.post(f"/api/cards/{c.pk}/verify/")
        self.assertEqual(r.status_code, 400)
        uid = User.objects.get(username="admin_chipo").pk
        r = self.client.post(f"/api/cards/{c.pk}/verify/", {"verified_by": uid}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["status"], "ACTIVE")
        self.assertEqual(r.data["verified_by"], uid)
        self.assertEqual(self.client.post(f"/api/cards/{c.pk}/archive/").data["status"], "ARCHIVED")
        self.assertEqual(self.client.post(f"/api/cards/{c.pk}/archive/").status_code, 400)
        self.assertEqual(self.client.post(f"/api/cards/{c.pk}/verify/", {"verified_by": uid}, format="json").status_code, 400)

    def test_token_fills_created_by(self):
        tok = self.client.post("/api/auth/login/", {"username": "editor_tendai", "password": "Theatre#2026"}, format="json").data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tok}")
        c = PreferenceCard.objects.get(procedure__name="Grommet insertion")
        self.client.post(f"/api/cards/{c.pk}/verify/")
        c.refresh_from_db()
        self.assertEqual(c.verified_by.username, "editor_tendai")

    def test_attachment_upload(self):
        c = self.card()
        f = SimpleUploadedFile("tray.png", b"\x89PNG fake", content_type="image/png")
        r = self.client.post("/api/card-attachments/", {"card": c.pk, "file": f, "caption": "Tray", "attachment_type": "TRAY_LAYOUT"}, format="multipart")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["mime_type"], "image/png")
        self.assertEqual(r.data["file_name"], "tray.png")
        self.assertTrue(r.data["file_size_bytes"] > 0)
        r2 = self.client.patch(f"/api/card-attachments/{r.data['id']}/", {"caption": "New"}, format="json")
        self.assertEqual(r2.data["caption"], "New")

    def test_docs_and_schema(self):
        self.assertEqual(self.client.get("/api/").status_code, 200)
        self.assertEqual(self.client.get("/api/schema/").status_code, 200)
        self.assertEqual(self.client.get("/api/docs/").status_code, 200)