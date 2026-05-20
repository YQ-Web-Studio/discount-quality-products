import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Column,
  Section,
  Text,
  Font,
} from '@react-email/components';
import * as React from 'react';

// Define the component properties
interface OrderConfirmationEmailProps {
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

export const OrderConfirmationEmail = ({
  customerName = 'Alex',
  orderNumber = 'YQ-98234-UK',
  orderDate = '24 October 2026',
  items = [
    {
      id: '1',
      title: 'Premium Aluminium Mechanical Keyboard',
      quantity: 1,
      price: '£120.00',
      thumbnail: `${baseUrl}/static/keyboard.jpg`, // Placeholder
    },
    {
      id: '2',
      title: 'Matte Black Desk Mat',
      quantity: 2,
      price: '£40.00',
      thumbnail: `${baseUrl}/static/deskmat.jpg`,
    },
  ],
  subtotal = '£160.00',
  vat = '£32.00',
  shipping = '£5.00',
  total = '£197.00',
  shippingAddress = {
    name: 'Alex Smith',
    line1: '128 High Street',
    city: 'London',
    postcode: 'E1 6AN',
    country: 'United Kingdom',
  },
  shippingMethod = 'Express Delivery',
}: OrderConfirmationEmailProps) => {
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
      <Preview>Order Confirmation: {orderNumber}</Preview>
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
              Thank you for your order, {customerName}.
            </Heading>
            <Text style={text}>
              Your payment has been processed successfully. We will organise your
              shipment shortly.
            </Text>
            <Text style={textBold}>Order Reference: {orderNumber}</Text>
            <Text style={textSecondary}>{orderDate}</Text>
          </Section>

          <Hr style={hr} />

          {/* Order Summary */}
          <Section style={tableSection}>
            <Heading as="h2" style={subheading}>
              Order Details
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
                              {/* Using a placeholder div for the thumbnail */}
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
                    <Text style={grandTotalLabelText}>Total</Text>
                  </td>
                  <td style={totalsValueCell}>
                    <Text style={grandTotalValueText}>{total}</Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Hr style={hr} />

          {/* Shipping Info */}
          <Section style={shippingSection}>
            <Heading as="h2" style={subheading}>
              Delivery Information
            </Heading>
            <table cellPadding={0} cellSpacing={0} style={{ width: '100%' }}>
              <tbody>
                <tr>
                  <td style={{ width: '50%', verticalAlign: 'top', paddingRight: '20px' }}>
                    <Text style={addressTitle}>Address</Text>
                    <Text style={addressText}>
                      {shippingAddress.name}
                      <br />
                      {shippingAddress.line1}
                      <br />
                      {shippingAddress.line2 && (
                        <>
                          {shippingAddress.line2}
                          <br />
                        </>
                      )}
                      {shippingAddress.city}
                      <br />
                      {shippingAddress.postcode}
                      <br />
                      {shippingAddress.country}
                    </Text>
                  </td>
                  <td style={{ width: '50%', verticalAlign: 'top' }}>
                    <Text style={addressTitle}>Method</Text>
                    <Text style={addressText}>{shippingMethod}</Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Need to organise a return? View our{' '}
              <Link href="#" style={link}>
                Returns Policy
              </Link>
              .
            </Text>
            <Text style={footerText}>
              Have a question?{' '}
              <Link href="#" style={link}>
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

export default OrderConfirmationEmail;

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
  color: '#888888',
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

const shippingSection = {
  padding: '40px 40px',
};

const addressTitle = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#888888',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 12px 0',
};

const addressText = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#333333',
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
