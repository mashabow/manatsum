# manatsum

手書き漢字字形収録のための Web アプリケーション

## 概要

手書き漢字字形をブラウザ上で収録するための、Web アプリケーションです。
サーバーサイドは Python で書かれており、フレームワークに Django を使用しています。

### manatsum?

- まな：真名（＝漢字）
- つむ：積む、あつむ：集む

## インストール

manatsum の実行には Python 2.7 が必要です。

### リポジトリの準備

manatsum の Git リポジトリをクローンします。

```
$ git clone git@github.com:mashabow/manatsum.git
```

クローンされたリポジトリに移動し、サブモジュールを初期化します。

```
$ cd manatsum
$ git submodule update --init
```

### 依存パッケージのインストール

次に、manatsum が依存している Python パッケージを pip でインストールします。
ここでは `--user` オプションをつけ、管理者権限なしで（自分のホームディレクトリ以下に）インストールする方法を示します。

pip がインストールされていない場合は、先に pip をインストールしておきます。

```
$ wget https://bootstrap.pypa.io/get-pip.py -O - | python - --user
```

そして、pip で依存パッケージをインストールします。

```
$ pip install --user -r requirements.txt
```

（[pyenv](https://github.com/yyuu/pyenv) や [pyenv-virtualenv](https://github.com/yyuu/pyenv-virtualenv) を利用してもいいかもしれません。）


### データベースの新規作成

以下のコマンドで、空のデータベースファイル `manatsum.sqlite3` を作成します。
収録した字形やアカウント情報など、manatsum のデータはすべてこのファイルに保存されます。

```
$ python manage.py migrate
```

### 管理者アカウントの作成

最後に、管理者アカウントを作成します。

```
$ python manage.py createsuperuser
```

ユーザー名、メールアドレス、パスワードを聞かれるので、適当なものを設定します。
メールアドレスは空で大丈夫です。
Django 管理サイト（後述）には、ここで設定したユーザー名とパスワードでログインすることができます。

以上でインストールは完了です。

なお、既存の `manatsum.sqlite3` を流用する場合は、「データベースの新規作成」と「管理者アカウントの作成」の操作は不要です。
リポジトリのルートにそのまま `manatsum.sqlite3` を配置してください。


## 管理

### 起動

次のコマンドで簡易サーバが起動します。

```
$ python manage.py runserver
```

起動完了後、 Web ブラウザから [http://localhost:8000/](http://localhost:8000/) にアクセスすると、manatsum のトップページが表示されるはずです。

### 終了

簡易サーバ動作している状態で端末から `Ctrl-C` を入力すれば、簡易サーバが終了します。

### データの操作

収録した字形やアカウント情報など、`manatsum.sqlite3` に保存されているデータに関しては、
Django 管理サイト [http://localhost:8000/admin/](http://localhost:8000/admin/) から操作（検索・削除・変更など）を行うことができます。この Django 管理サイトは、管理者アカウントでしかログインできません。

ただし、複雑な操作が必要な場合には、管理サイトではなく Python から行った方がよいでしょう。

## 手書き字形の収録

### ユーザーの作成

収録を行う各書字者に対して、ユーザーアカウントがそれぞれ必要になります。
Django 管理サイト [http://localhost:8000/admin/](http://localhost:8000/admin/)
に管理者アカウントでログインし、
[ユーザーの追加](http://localhost:8000/admin/auth/user/add/)を行ってください。

なお、以下のように、シェル上からユーザーアカウントを作成することもできます。

```
$ python manage.py shell
In [1]: from django.contrib.auth.models import User

In [2]: User.objects.create_user('nanashi', password='pasuwa-do')
Out[2]: <User: nanashi>

In [3]: # Ctrl-D を入力
Do you really want to exit ([y]/n)? y
```

### 収録

収録を行う書字者は、ユーザー名とパスワードを入力して manatsum にログインします。
ログイン後、トップページやマイページにある **収録を始める** ボタンをクリックすると、収録画面に移動します。

収録画面では、左側に例示グリフが表示されるので、これを参考にして右側の枠に書字を行います。
書き間違えた場合は、 **消去** ボタンを押すと白紙に戻ります。
1文字書字したら左下の **送信** ボタンを押し、正常に送信が完了すれば、次の文字に移ります。
現在の仕様では、（旧）常用漢字1945字が五十音順に表示されるようになっています。
収録を中断・終了する際は、ブラウザの戻るボタンを押すか、そのままタブを閉じてください。

### データ形式

収録したデータは、マイページやユーザーページにある **グリフデータをダウンロード** ボタンからダウンロードできます。ファイル名は `ユーザー名.json` となっています。

このファイルのデータ形式は、以下のとおりです。

```
{
  "username": "yuichi",  // ユーザー名
  "user_id": 8,          // ユーザー番号
  "dump_time": "2015-03-07T20:12:19.982+09:00",  // この JSON の出力日時
  "glyph_dict": { ... }  // グリフ辞書本体
}  
```

グリフ辞書本体の部分に、実際の手書き字形データが格納されます。
これは以下のように、文字をキーとした辞書（ハッシュ）になっています。

```
{
  "威": {
    "strokes": [
      [  // 1画目
        { "time":    0, "x": 283, "y": 244 },  // 1画目の1点目
        { "time":   29, "x": 279, "y": 244 },  // 1画目の2点目
        ...
        { "time":  362, "x": 166, "y": 775 }   // 1画目の最後の点
      ],
      [  // 2画目
        { "time":  897, "x": 299, "y": 263 },  // 2画目の1点目
        { "time":  909, "x": 299, "y": 267 },  // 2画目の2点目
        ...
        { "time": 1227, "x": 857, "y": 244 }   // 2画目の最後の点
      ],
      ...
    ],
    "create_date": "2014-11-21T17:57:52.735+09:00"  // この文字の登録日時
  },
  "尉": {
    ...
  },
  ...
}
```

`time` は、その文字の最初の画を書き始めてからの時間 [ms] で、`x`, `y` はその点の座標です。
この座標系は、書字枠の左上隅を原点 (0, 0) とし、右下隅が (1000, 1000) となっています。
下向きが y 軸正となっていることに注意してください。
なお、`time`, `x`, `y` は、整数値で表現されます。

## ライセンスと著作権表示

© 2013–2015 Masaya Nakamura.

This software released under the [MIT License](http://opensource.org/licenses/MIT), see LICENSE.

このソフトウェアは MIT ライセンスの下で公開されています。
LICENSE を参照してください。

収録画面の例示グリフには [KanjiVG](http://kanjivg.tagaini.net/) のデータを利用しています。

KanjiVG is copyright © 2009–2013 Ulrich Apel and released under the [Creative Commons Attribution-Share Alike 3.0](http://creativecommons.org/licenses/by-sa/3.0/) license.
