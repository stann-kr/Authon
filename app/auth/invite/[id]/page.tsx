import InvitePageClient from './InvitePageClient';

export async function generateStaticParams() {
  return [
    { id: 'placeholder' }
  ];
}

export default function InvitePage({ params }: { params: { id: string } }) {
  return <InvitePageClient inviteId={params.id} />;
}
