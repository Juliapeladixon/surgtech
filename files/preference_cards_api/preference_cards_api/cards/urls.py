from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("users", views.UserViewSet, basename="user")
router.register("specialties", views.SpecialtyViewSet, basename="specialty")
router.register("doctors", views.DoctorViewSet, basename="doctor")
router.register("surgeons", views.SurgeonViewSet, basename="surgeon")
router.register("procedures", views.ProcedureViewSet, basename="procedure")
router.register("sutures", views.SutureViewSet, basename="suture")
router.register("instruments", views.SurgicalInstrumentViewSet, basename="instrument")
router.register("packs", views.SurgicalPackViewSet, basename="pack")
router.register("cards", views.CardViewSet, basename="card")
router.register("card-items", views.CardItemViewSet, basename="card-item")
router.register("card-notes", views.CardNoteViewSet, basename="card-note")
router.register("card-attachments", views.CardAttachmentViewSet, basename="card-attachment")

auth_patterns = [
    path("register/", views.RegisterView.as_view(), name="auth-register"),
    path("login/", views.LoginView.as_view(), name="auth-login"),
    path("logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("me/", views.MeView.as_view(), name="auth-me"),
    path("change-password/", views.ChangePasswordView.as_view(), name="auth-change-password"),
]

urlpatterns = [
    path("auth/", include(auth_patterns)),
    path("", include(router.urls)),
]