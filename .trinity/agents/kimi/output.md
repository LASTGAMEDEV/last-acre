--- Logging error in Loguru Handler #1 ---
Record was: {'elapsed': datetime.timedelta(seconds=10, microseconds=134205), 'exception': None, 'extra': {'sid': '', 'se
ssion_id': '0e5b378f-e188-470d-b199-c7936fd7a978'}, 'file': (name='__init__.py', path='C:\\Users\\SanGi\\AppData\\Roamin
g\\uv\\tools\\kimi-cli\\Lib\\site-packages\\kimi_cli\\cli\\__init__.py'), 'function': '_run', 'level': (name='INFO', no=
20, icon='ℹ️'), 'line': 583, 'message': 'Created new session: 0e5b378f-e188-470d-b199-c7936fd7a978', 'module': '__init__
'
, 'name': 'kimi_cli.cli', 'process': (id=28060, name='MainProcess'), 'thread': (id=16564, name='MainThread'), 'time': da
tetime(2026, 5, 20, 16, 35, 32, 90797, tzinfo=datetime.timezone(datetime.timedelta(seconds=7200), 'Hora de verano romanc
e'))}
Traceback (most recent call last):
  File "C:\Users\SanGi\AppData\Roaming\uv\tools\kimi-cli\Lib\site-packages\loguru\_handler.py", line 206, in emit
    self._sink.write(str_record)
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^
  File "C:\Users\SanGi\AppData\Roaming\uv\tools\kimi-cli\Lib\site-packages\loguru\_file_sink.py", line 204, in write
    self._terminate_file(is_rotating=True)
    ~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^
  File "C:\Users\SanGi\AppData\Roaming\uv\tools\kimi-cli\Lib\site-packages\loguru\_file_sink.py", line 276, in _terminat
e_file
    os.rename(old_path, renamed_path)
    ~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^
PermissionError: [WinError 32] El proceso no tiene acceso al archivo porque está siendo utilizado por otro proceso: 'C:\
\Users\\SanGi\\.kimi\\logs\\kimi.log' -> 'C:\\Users\\SanGi\\.kimi\\logs\\kimi.2026-05-19_15-10-37_891394.log'
--- End of logging error ---
C:\Users\SanGi\AppData\Roaming\uv\tools\kimi-cli\Lib\site-packages\fastmcp\server\auth\providers\jwt.py:10: AuthlibDepre
cationWarning: authlib.jose module is deprecated, please use joserfc instead.
It will be compatible before version 2.0.0.
  from authlib.jose import JsonWebKey, JsonWebToken
╭────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│                                                                                                            │
│   ▐█▛█▛█▌  Welcome to Kimi Code CLI!                                                                       │
│   ▐█████▌  Send /help for help information.                                                                │
│                                                                                                            │
│  Directory: ~\.antigravity\FArM TYCOON\granja-tycoon                                                       │
│  Session: 0e5b378f-e188-470d-b199-c7936fd7a978                                                             │
│  Model: Kimi-k2.6                                                                                          │
│                                                                                                            │
│  Tip: Spot a bug or have feedback? Type /feedback right in this session — every report makes Kimi better.  │
│                                                                                                            │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────╯


── input ──────────────────────────────────────────────────────────────────────────────────────────────────────────────








───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
agent (Kimi-k2.6 ●)  …ity\FArM TYCOON\granja-tycoon  main [±]  shift-tab: plan mode | ctrl-o: editor
                                                                                               context: 0.0% (0/262.1k)