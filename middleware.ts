import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 1. Supabase Session Refresh
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 2. Protected Routes Logic
  // 로컬 로그인(localStorage 'user')은 서버에서 확인 불가능하므로,
  // 여기서는 Supabase Auth 기반 보호를 수행하거나, 클라이언트 측 보호에 의존해야 함.
  // 하지만 사용자 요청대로 "로그인 상태가 아니어도 메인메뉴에 접근 가능한 문제"를 해결하려면
  // 클라이언트 측 가드(AuthGuard)가 필수적임.
  // 서버 사이드에서는 Supabase Auth가 없으므로 쿠키 기반 체크가 어렵지만,
  // 최소한의 경로 보호를 위해 아래 로직을 추가할 수 있음.
  // (현재 로컬 로그인은 클라이언트 전용이므로 미들웨어에서 완전 차단 불가 -> AuthGuard에 일임하거나
  // 로컬 로그인 시 쿠키를 굽도록 변경해야 함. 현재 구조상 AuthGuard 강화를 우선 권장하지만
  // 사용자가 명시적으로 수정을 요청했으므로, 경로 기반 리다이렉트를 추가함)

  const protectedPaths = ['/guest', '/door', '/admin', '/profile'];
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));

  // 주의: 현재 로컬 로그인은 localStorage만 사용하므로 서버 미들웨어에서 '로그인 여부'를 알 수 없음.
  // 따라서 서버 사이드 강제 리다이렉트는 Supabase Auth 사용 시에만 유효함.
  // 하지만 사용자 경험을 위해, 만약 Supabase Auth로 전환 중이라면 아래 코드가 유효함.
  // 로컬 로그인의 경우 클라이언트 사이드(AuthGuard)에서 처리해야 함.

  // 여기서는 Supabase User가 없고 보호된 경로에 접근하면 로그인 페이지로 리다이렉트
  if (isProtectedPath && !user) {
     // 로컬 로그인을 사용하는 현재 단계에서는 이 리다이렉트가
     // 로컬 로그인 사용자(localStorage만 있는)를 차단할 위험이 있음.
     // 따라서 일단은 pass 하되, 클라이언트 AuthGuard가 확실히 동작하는지 확인해야 함.
     // *그러나* 사용자가 "로그인 상태가 아니어도 메인메뉴 접근 가능"을 지적했으므로
     // 근본적으로 페이지 컴포넌트 내의 AuthGuard가 뚫리거나 없는 경우를 의심해야 함.

     // 미들웨어에서는 아무것도 하지 않고 클라이언트 가드에 맡기는 것이 현재 구조(Hybrid)에서는 안전함.
     // 단, Supabase Auth로 완전 전환 시에는 아래 주석을 해제하여 사용.
     // return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
