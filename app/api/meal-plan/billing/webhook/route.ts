export async function POST() {
  return new Response("Billing is not enabled yet.", { status: 501 });
}
