import type { Metadata } from "next";
import { ContactsClient } from "@/components/contacts/contacts-client";

export const metadata: Metadata = { title: "مخاطبین" };

export default function ContactsPage() {
  return <ContactsClient />;
}
