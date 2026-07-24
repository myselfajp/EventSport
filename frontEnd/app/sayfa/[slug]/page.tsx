import { redirect } from "next/navigation";

type Props = { params: { slug: string } };

export default function LegacyStaticPageRedirect({ params }: Props) {
  redirect(`/page/${params.slug}`);
}
