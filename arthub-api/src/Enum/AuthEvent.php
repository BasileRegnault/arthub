<?php

namespace App\Enum;

enum AuthEvent: string
{
    case REGISTER_SUCCESS = 'REGISTER_SUCCESS';
    case REGISTER_FAILED = 'REGISTER_FAILED';
    case LOGIN_SUCCESS = 'LOGIN_SUCCESS';
    case LOGIN_FAILED = 'LOGIN_FAILED';
}