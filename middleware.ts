import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "abastosgest-secret-key-2024"
)

const PUBLIC_PATHS   = ["/login", "/api/auth/login"]
const ADMIN_ONLY_PATHS = ["/proveedores", "/reportes", "/api/proveedores", "/api/reportes"]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p)) || pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next()
  }

  const token = req.cookies.get("auth_token")?.value
  if (!token) return NextResponse.redirect(new URL("/login", req.url))

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const rol = payload.rol as string
    if (rol !== "admin" && ADMIN_ONLY_PATHS.some(p => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/?acceso=denegado", req.url))
    }
    return NextResponse.next()
  } catch {
    const response = NextResponse.redirect(new URL("/login", req.url))
    response.cookies.delete("auth_token")
    return response
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
}
