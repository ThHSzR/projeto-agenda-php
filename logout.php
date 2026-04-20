<?php
session_start();
session_destroy();
header('Location: src/login.html');
exit;
