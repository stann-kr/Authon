import InvitePageClient from './InvitePageClient';

export async function generateStaticParams() {
  return [
    { id: 'placeholder' }
  ];
}

export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvitePageClient inviteId={id} />;
}
