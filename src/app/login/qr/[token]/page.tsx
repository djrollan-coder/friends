import { QrConfirmScreen } from "@/components/QrConfirmScreen";

export default async function QrConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <QrConfirmScreen token={token} />;
}
