import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Column,
  Section,
  Text,
  Font,
} from '@react-email/components';
import * as React from 'react';

interface OrderRefundedEmailProps {
  customerName?: string;
  orderNumber?: string;
  orderDate?: string;
  items?: Array<{
    id: string;
    title: string;
    quantity: number;
    price: string;
    thumbnail: string;
  }>;
  subtotal?: string;
  vat?: string;
  shipping?: string;
  total?: string;
  refundAmount?: string;
  shippingAddress?: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    country: string;
  };
  shippingMethod?: string;
}

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

export const OrderRefundedEmail = ({
  customerName = 'Alex',
  orderNumber = 'YQ-98234-UK',
  orderDate = '24 October 2026',
  items = [
    {
      id: '1',
      title: 'Premium Aluminium Mechanical Keyboard',
      quantity: 1,
      price: '£120.00',
      thumbnail: `${baseUrl}/static/keyboard.jpg`,
    },
  ],
  subtotal = '£120.00',
  vat = '£24.00',
  shipping = '£0.00',
  total = '£144.00',
  refundAmount = '£144.00',
  shippingAddress = {
    name: 'Alex Smith',
    line1: '128 High Street',
    city: 'London',
    postcode: 'E1 6AN',
    country: 'United Kingdom',
  },
  shippingMethod = 'Free Delivery',
}: OrderRefundedEmailProps) => {
  return (
    <Html>
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf',
            format: 'woff2',
          }}
          fontWeight={600}
          fontStyle="normal"
        />
      </Head>
      <Preview>Refund Issued: Order #{orderNumber}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Row>
              <Column>
                <Text style={logoMain}>DISCOUNT</Text>
                <Text style={logoSub}>Quality Products</Text>
              </Column>
            </Row>
          </Section>

          {/* Hero */}
          <Section style={heroSection}>
            <Heading style={heading}>
              Your refund has been issued, {customerName}.
            </Heading>
            <Text style={text}>
              We have processed a refund for your order. A summary of the refunded amount and order details is provided below.
            </Text>
            <Text style={textBold}>Order Reference: {orderNumber}</Text>
            <Text style={textSecondary}>Refund processed on {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          </Section>

          <Hr style={hr} />

          {/* Refund Summary Banner */}
          <Section style={refundSection}>
            <Heading as="h2" style={subheading}>
              Refund Details
            </Heading>
            <div style={refundAlertBox}>
              <Text style={refundAlertTitle}>Amount Refunded</Text>
              <Text style={refundAlertValue}>{refundAmount}</Text>
            </div>
            <Text style={textSecondary}>
              Please note: It can take between 5 to 10 business days for the funds to appear back in your account, depending on your bank or credit card issuer.
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Order Summary */}
          <Section style={tableSection}>
            <Heading as="h2" style={subheading}>
              Original Order Items
            </Heading>
            <table style={table} cellPadding={0} cellSpacing={0}>
              <thead>
                <tr>
                  <th style={thLeft}>Item</th>
                  <th style={thCenter}>Qty</th>
                  <th style={thRight}>Price</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={tdLeft}>
                      <table cellPadding={0} cellSpacing={0}>
                        <tbody>
                          <tr>
                            <td style={thumbnailCell}>
                              <div style={thumbnailPlaceholder} />
                            </td>
                            <td style={itemTitleCell}>
                              <Text style={itemTitle}>{item.title}</Text>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                    <td style={tdCenter}>
                      <Text style={itemText}>{item.quantity}</Text>
                    </td>
                    <td style={tdRight}>
                      <Text style={itemText}>{item.price}</Text>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Hr style={hr} />

          {/* Totals Box */}
          <Section style={totalsSection}>
            <table style={totalsTable} cellPadding="0" cellSpacing="0">
              <tbody>
                <tr>
                  <td style={totalsLabelCell}>
                    <Text style={totalLabelText}>Subtotal</Text>
                  </td>
                  <td style={totalsValueCell}>
                    <Text style={totalValueText}>{subtotal}</Text>
                  </td>
                </tr>
                <tr>
                  <td style={totalsLabelCell}>
                    <Text style={totalLabelText}>20% VAT</Text>
                  </td>
                  <td style={totalsValueCell}>
                    <Text style={totalValueText}>{vat}</Text>
                  </td>
                </tr>
                <tr>
                  <td style={totalsLabelCell}>
                    <Text style={totalLabelText}>Shipping ({shippingMethod})</Text>
                  </td>
                  <td style={totalsValueCell}>
                    <Text style={totalValueText}>{shipping}</Text>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2}>
                    <Hr style={totalHr} />
                  </td>
                </tr>
                <tr>
                  <td style={totalsLabelCell}>
                    <Text style={grandTotalLabelText}>Order Total</Text>
                  </td>
                  <td style={totalsValueCell}>
                    <Text style={grandTotalValueText}>{total}</Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Need to check our terms? View our{' '}
              <Link href={`${baseUrl}/terms`} style={link}>
                Terms & Conditions
              </Link>
              .
            </Text>
            <Text style={footerText}>
              Have a question?{' '}
              <Link href={`${baseUrl}/contact`} style={link}>
                Contact Us
              </Link>
              .
            </Text>
            <Text style={footerCopyright}>
              &copy; {new Date().getFullYear()} Discount Quality Products. All rights reserved.
            </Text>
            <Text style={footerAttribution}>
              Engineered by <Link href="https://yqwebstudio.com" style={linkSecondary}>YQ Web Studio</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default OrderRefundedEmail;

// --- Styles ---

const main = {
  backgroundColor: '#f9f9f9',
  fontFamily: 'Inter, Helvetica, Arial, sans-serif',
  padding: '40px 0',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  border: '1px solid #e0e0e0',
  borderRadius: '2px',
  width: '600px',
  maxWidth: '100%',
};

const header = {
  padding: '40px',
  borderBottom: '1px solid #e0e0e0',
};

const logoMain = {
  fontSize: '28px',
  fontWeight: '900',
  fontStyle: 'italic',
  letterSpacing: '-1px',
  color: '#000000',
  margin: '0',
  lineHeight: '1',
};

const logoSub = {
  fontSize: '10px',
  fontWeight: '700',
  letterSpacing: '4px',
  color: '#71717a',
  textTransform: 'uppercase' as const,
  margin: '4px 0 0 0',
  lineHeight: '1',
};

const heroSection = {
  padding: '40px 40px',
};

const refundSection = {
  padding: '30px 40px',
  backgroundColor: '#fcfcfc',
};

const refundAlertBox = {
  backgroundColor: '#f4f4f5',
  border: '1px solid #e4e4e7',
  borderRadius: '6px',
  padding: '20px',
  marginBottom: '16px',
  textAlign: 'center' as const,
};

const refundAlertTitle = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#71717a',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 4px 0',
};

const refundAlertValue = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#18181b',
  margin: '0',
};

const heading = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#000000',
  margin: '0 0 16px 0',
  letterSpacing: '-0.5px',
};

const text = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#333333',
  margin: '0 0 16px 0',
};

const textBold = {
  fontSize: '15px',
  lineHeight: '24px',
  fontWeight: '600',
  color: '#000000',
  margin: '0',
};

const textSecondary = {
  fontSize: '13px',
  lineHeight: '20px',
  color: '#71717a',
  margin: '4px 0 0 0',
};

const hr = {
  borderColor: '#e0e0e0',
  borderWidth: '1px',
  margin: '0',
};

const tableSection = {
  padding: '40px 40px',
};

const subheading = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#000000',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 20px 0',
};

const table = {
  width: '100%',
};

const thLeft = {
  textAlign: 'left' as const,
  paddingBottom: '12px',
  borderBottom: '1px solid #000000',
  fontSize: '12px',
  fontWeight: '600',
  color: '#000000',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

const thCenter = {
  textAlign: 'center' as const,
  paddingBottom: '12px',
  borderBottom: '1px solid #000000',
  fontSize: '12px',
  fontWeight: '600',
  color: '#000000',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

const thRight = {
  textAlign: 'right' as const,
  paddingBottom: '12px',
  borderBottom: '1px solid #000000',
  fontSize: '12px',
  fontWeight: '600',
  color: '#000000',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

const tdLeft = {
  padding: '16px 0',
  borderBottom: '1px solid #e0e0e0',
};

const tdCenter = {
  padding: '16px 0',
  textAlign: 'center' as const,
  borderBottom: '1px solid #e0e0e0',
  width: '60px',
};

const tdRight = {
  padding: '16px 0',
  textAlign: 'right' as const,
  borderBottom: '1px solid #e0e0e0',
  width: '100px',
};

const thumbnailCell = {
  width: '40px',
  paddingRight: '16px',
};

const thumbnailPlaceholder = {
  width: '40px',
  height: '40px',
  backgroundColor: '#f0f0f0',
  border: '1px solid #e0e0e0',
  borderRadius: '2px',
};

const itemTitleCell = {
  verticalAlign: 'middle' as const,
};

const itemTitle = {
  fontSize: '14px',
  color: '#000000',
  margin: '0',
  fontWeight: '500',
};

const itemText = {
  fontSize: '14px',
  color: '#333333',
  margin: '0',
};

const totalsSection = {
  padding: '30px 40px',
  backgroundColor: '#fafafa',
};

const totalsTable = {
  width: '100%',
};

const totalsLabelCell = {
  paddingBottom: '8px',
  width: '50%',
};

const totalsValueCell = {
  paddingBottom: '8px',
  width: '50%',
  textAlign: 'right' as const,
};

const totalLabelText = {
  fontSize: '14px',
  color: '#555555',
  margin: '0',
};

const totalValueText = {
  fontSize: '14px',
  color: '#000000',
  margin: '0',
};

const totalHr = {
  borderColor: '#e0e0e0',
  borderWidth: '1px',
  margin: '12px 0',
};

const grandTotalLabelText = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#000000',
  margin: '0',
};

const grandTotalValueText = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#000000',
  margin: '0',
};

const footer = {
  padding: '40px',
  backgroundColor: '#000000',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '13px',
  color: '#aaaaaa',
  margin: '0 0 12px 0',
};

const link = {
  color: '#ffffff',
  textDecoration: 'underline',
};

const linkSecondary = {
  color: '#ffffff',
  fontWeight: '700',
  textDecoration: 'none',
};

const footerCopyright = {
  fontSize: '11px',
  color: '#666666',
  marginTop: '24px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

const footerAttribution = {
  fontSize: '11px',
  color: '#666666',
  marginTop: '8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};
