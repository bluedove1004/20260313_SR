from rest_framework import serializers
from ..models import SearchProject, LiteratureRecord

class SearchProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchProject
        fields = '__all__'

class LiteratureRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiteratureRecord
        fields = '__all__'

class SearchQuerySerializer(serializers.Serializer):
    query = serializers.CharField(required=False, allow_blank=True)
    disease = serializers.CharField(required=False, allow_blank=True)
    formula = serializers.CharField(required=False, allow_blank=True)
    category = serializers.CharField(required=False, allow_blank=True, default="")
    include_rct = serializers.BooleanField(required=False, default=True)
    exact_query = serializers.CharField(required=False, allow_blank=True)
    api_key = serializers.CharField(required=False, allow_blank=True)
    max_results = serializers.IntegerField(required=False, default=200)
    dbs = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=['PubMed']
    )

class ExpandQuerySerializer(serializers.Serializer):
    disease = serializers.CharField(required=False, allow_blank=True)
    formula = serializers.CharField(required=False, allow_blank=True)
    category = serializers.CharField(required=False, allow_blank=True, default="")
    include_rct = serializers.BooleanField(required=False, default=True)
    api_key = serializers.CharField(required=False, allow_blank=True)
