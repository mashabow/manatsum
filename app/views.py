# coding: utf-8

from django.contrib.auth import logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponse, HttpResponseForbidden
from django.shortcuts import get_object_or_404, render
from django.utils import timezone

from .models import Glyph
from manatsum.settings import TIME_ZONE

import collections
import json
import pytz


def index(request):
    '''
    トップページ
    '''
    return render(request, 'index.html')


def logout(request):
    '''
    ログアウトする
    '''
    auth_logout(request)
    return render(request, 'logout.html')


@login_required
def user_list(request):
    '''
    ユーザーの一覧
    '''
    return render(request, 'user_list.html', {'user_list': User.objects.all()})


@login_required
def user_detail(request, user_id):
    '''
    ユーザーの詳細
    '''
    target_user = get_object_or_404(User, pk=user_id)
    obj = __paginate_glyphs(request, target_user.glyph_set.all())
    obj['target_user'] = target_user
    return render(request, 'user_detail.html', obj)


@login_required
def mypage(request):
    '''
    マイページ（user_detail に類似した view）
    '''
    obj = __paginate_glyphs(request, request.user.glyph_set.all())
    obj['target_user'] = request.user
    return render(request, 'mypage.html', obj)


@login_required
def dump_user_glyphset(request, user_id):
    '''
    指定したユーザのグリフデータを dump する
    '''

    target_user = get_object_or_404(User, pk=user_id)
    now = timezone.now().astimezone(pytz.timezone(TIME_ZONE))

    # json オブジェクトの作成
    obj = collections.OrderedDict([
        ('username', target_user.username),
        ('user_id', target_user.id),
        ('dump_time', now),
        ('glyph_dict', {
            g.character: g.to_json_obj() for g in target_user.glyph_set.all()
        }),
    ])

    # レスポンスを返す
    response = HttpResponse(content_type='application/json')
    response['Content-Disposition'] = 'attachment; filename=%s.json' % target_user.username
    json.dump(obj, response, ensure_ascii=False, cls=DjangoJSONEncoder)
    return response


@login_required
def glyph_list(request):
    '''
    グリフの一覧
    '''
    return render(request, 'glyph_list.html',
                  __paginate_glyphs(request, Glyph.objects.all()))


@login_required
def glyph_detail(request, glyph_id):
    '''
    グリフの詳細
    '''
    g = get_object_or_404(Glyph, pk=glyph_id)
    return render(request, 'glyph_detail.html', {'glyph': g})


@login_required
def character_list(request):
    '''
    文字の一覧
    '''
    chars = sorted(set(g.character for g in Glyph.objects.all()))  # unique + sort
    return render(request, 'character_list.html', {
        'character_list': [(c, '%04x' % ord(c)) for c in chars]
    })


@login_required
def character_detail(request, code):
    '''
    文字の詳細
    '''
    c = unichr(int(code, 16))
    return render(request, 'character_detail.html', {
        'character': c,
        'code': code.upper(),
        'glyph_list': Glyph.objects.filter(character=c),
    })


@login_required
def manatsum(request):
    '''
    収録画面
    '''
    return render(request, 'manatsum.html')


def post_glyph(request):
    '''
    送信されたグリフデータを受け付ける
    '''

    # ログインしていない場合
    if not request.user.is_authenticated():
        return HttpResponseForbidden('ログインしていません')

    glyph_json = json.loads(request.POST['glyph_json'])
    g = Glyph(user=request.user,
              character=glyph_json['character'],
              strokes=json.dumps(glyph_json['strokes']),
              create_date=timezone.now())
    g.save()
    return HttpResponse('saved.')


def __paginate_glyphs(request, glyphs, per_page=200):
    '''
    グリフを per_page 個ごとにページング
    '''

    paginator = Paginator(glyphs, per_page)

    page = request.GET.get('page')
    try:
        glyphs = paginator.page(page)
    except PageNotAnInteger:
        # int 以外なら最初のページを表示
        glyphs = paginator.page(1)
    except EmptyPage:
        # ページ範囲を超えていたら最後のページを表示
        glyphs = paginator.page(paginator.num_pages)

    # ページャに表示するページ番号のリストを求める
    length = 5
    start = glyphs.number - (length - 1) // 2
    end = glyphs.number + (length - 1) // 2
    if start < 1:
        start = 1
        end = min(length, paginator.num_pages)
    if end > paginator.num_pages:
        end = paginator.num_pages
        start = max(end - length + 1, 1)
    page_nums = range(start, end+1)

    return {'glyphs': glyphs, 'page_nums': page_nums}
