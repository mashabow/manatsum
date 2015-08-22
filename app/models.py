# coding: utf-8

from django.contrib.auth.models import User
from django.db import models

from manatsum.settings import TIME_ZONE

import json
import pytz
import svgwrite


class Glyph(models.Model):

    user = models.ForeignKey(User)
    character = models.CharField(max_length=10)
    strokes = models.CharField(max_length=10000)  # ストロークのデータ。json ベタ書き
    create_date = models.DateTimeField()  # 登録日時

    def to_svg(self, size=128):
        '''
        SVG 画像にしてその文字列を返す
        '''
        dwg = svgwrite.Drawing(
            size=(size, size),
            viewBox='0 0 1000 1000',
            stroke='#000',
            fill='none',
            style='''
stroke-width: 25px;
stroke-linecap: round;
stroke-linejoin: round;
background-color: #fff;
border: solid 1px #bbb;
''')
        for stroke in json.loads(self.strokes):
            dwg.add(dwg.polyline([(p['x'], p['y']) for p in stroke]))
        return dwg.tostring()

    def thumbnail(self):
        '''
        サムネイル用の SVG 画像を得る
        '''
        return self.to_svg(32)
    thumbnail.allow_tags = True

    def strokes_pretty_json(self):
        '''
        strokes の json 文字列を整形して返す
        '''
        obj = json.loads(self.strokes)
        string = json.dumps(obj, sort_keys=True)
        string = string.replace('], [', '\n  ], [').replace('{', '\n    {')
        string = string.replace('[[', '[\n  [').replace(']]', '\n  ]\n]')
        return string

    def to_json_obj(self):
        '''
        json を dump するときのためのオブジェクトを作って返す
        '''
        return {
            'strokes': json.loads(self.strokes),
            'create_date': self.create_date.astimezone(pytz.timezone(TIME_ZONE))
        }

    def code_url(self):
        return '%04x' % ord(self.character)

    def code_text(self):
        return 'U+%04X' % ord(self.character)

    def __unicode__(self):
        return self.character
