# coding: utf-8

from django.conf.urls import patterns, include, url
import app.views as av
import django.contrib.auth.views

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()


urlpatterns = patterns(
    '',
    url(r'^$', av.index),

    url(r'^login/$', django.contrib.auth.views.login, {'template_name': 'login.html'}),
    url(r'^logout/$', av.logout),

    url(r'^mypage/$', av.mypage),
    url(r'^users/$', av.user_list),
    url(r'^users/(?P<user_id>\d+)/$', av.user_detail),
    url(r'^users/(?P<user_id>\d+)/dump/$', av.dump_user_glyphset),
    url(r'^glyphs/$', av.glyph_list),
    url(r'^glyphs/(?P<glyph_id>\d+)/$', av.glyph_detail),
    url(r'^characters/$', av.character_list),
    url(r'^characters/(?P<code>[\da-f]{4,5})/$', av.character_detail),
    url(r'^manatsum/$', av.manatsum),
    url(r'^manatsum/post/$', av.post_glyph),

    # Uncomment the next line to enable the admin:
    url(r'^admin/', include(admin.site.urls)),
)
