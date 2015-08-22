# coding: utf-8

from django.conf.urls import patterns, include, url
import app.urls

urlpatterns = patterns(
    '',
    url(r'^', include(app.urls)),
)
