<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Symfony\Component\HttpFoundation\Response;

class PreventSelfAction
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $enc = $request->route('id');

        if (!$enc) {
            return $next($request);
        }

        try {
            $id = Crypt::decryptString($enc);
        } catch (DecryptException $e) {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Invalid ID.'], 400);
            }

            return redirect()->back()->with('error', 'Invalid ID.');
        }

        if ((int)$id === (int)Auth::id()) {
            $message = 'You cannot modify or delete your own account.';

            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => $message], 403);
            }

            return redirect()->back()->with('error', $message);
        }

        return $next($request);
    }
}
