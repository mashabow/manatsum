# coding: utf-8

'''
管理サイト（http://example.com/admin/）の設定
'''

from django.contrib import admin
from .models import Glyph


class GlyphAdmin(admin.ModelAdmin):
    list_filter = ['user']
    search_fields = ['character']
    date_hierarchy = 'create_date'
    list_display = ('thumbnail', 'character', 'user', 'create_date')

admin.site.register(Glyph, GlyphAdmin)
