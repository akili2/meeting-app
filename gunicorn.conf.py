import eventlet
from eventlet import wsgi

bind = "0.0.0.0:10000"
workers = 1
worker_class = "eventlet"
timeout = 120
