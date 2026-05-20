import ContactContent from "./ContactContent";

export const metadata = {
  title: "Contact Us",
  description:
    "Get in touch with Discount Quality Products Ltd. for sales enquiries, technical assistance, and post-purchase support. Call or email our UK team today.",
  alternates: { canonical: "https://discountqualityproducts.co.uk/contact" },
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white">
      <ContactContent />
    </main>
  );
}
