from django.urls import path
from .views import ParseAndExtractView

urlpatterns = [
    path('parse-pdf/', ParseAndExtractView.as_view(), name='parse_pdf'),
]
