from django.urls import path
from .views import FederatedSearchView, SaveRecordsView, DeduplicateRecordsView, DashboardStatsView

urlpatterns = [
    path('federated_search/', FederatedSearchView.as_view(), name='federated_search'),
    path('save_records/', SaveRecordsView.as_view(), name='save_records'),
    path('deduplicate/', DeduplicateRecordsView.as_view(), name='deduplicate'),
    path('dashboard_stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
]
