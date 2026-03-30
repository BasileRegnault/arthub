<?php

namespace App\Enum;

enum ValidationStatus: string
{
    case APPROVED = 'approved';
    case REJECTED = 'rejected';
}