import InvitePageClient from './InvitePageClient';

export async function generateStaticParams() {
  return [
    { id: 'placeholder' }
  ];
}

export default async function InvitePage({ params }: { params: { id: string } }) {
  const { id } = params;
  return <InvitePageClient inviteId={id} />;
}
