import { logoutAction } from "@/app/(auth)/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        className="rounded-xl border border-booth-line bg-white px-4 py-2 text-sm font-black text-booth-ink shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200"
        type="submit"
      >
        로그아웃
      </button>
    </form>
  );
}
