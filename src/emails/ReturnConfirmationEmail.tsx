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
interface ReturnConfirmationEmailProps {
  orderNumber?: string;
  returnReason?: string;
  comments?: string;
  items?: Array<{
    id: string;
    name: string;
    quantity: number;
    thumbnail: string | null;
  }>;
}

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

export const ReturnConfirmationEmail = ({
  orderNumber = '12345',
  returnReason = 'Incorrect item received',
  comments = 'I ordered the red one but received the blue one.',
  items = [
    {
      id: '1',
      name: 'Premium Aluminium Mechanical Keyboard',
      quantity: 1,
      thumbnail: null,
    },
  ],
}: ReturnConfirmationEmailProps) => {
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
      <Preview>Return Request Received: {orderNumber}</Preview>
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
              We've received your return request.
            </Heading>
            <Text style={text}>
              Thank you for submitting your return request for order <strong>#{orderNumber}</strong>. 
              Our team is currently reviewing your request and will follow up shortly with further instructions.
            </Text>
            <Text style={textSecondary}>Please allow up to 48 hours for a response.</Text>
          </Section>

          <Hr style={hr} />

          {/* Details Section */}
          <Section style={tableSection}>
            <Heading as="h2" style={subheading}>
              Return Details
            </Heading>
            <Text style={text}><strong>Reason:</strong> {returnReason}</Text>
            {comments && <Text style={text}><strong>Comments:</strong> {comments}</Text>}
            <br />
            <table style={table} cellPadding={0} cellSpacing={0}>
              <thead>
                <tr>
                  <th style={thLeft}>Items to Return</th>
                  <th style={thCenter}>Qty</th>
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
                              {item.thumbnail ? (
                                <Img src={item.thumbnail} alt={item.name} style={thumbnailImage} />
                              ) : (
                                <div style={thumbnailPlaceholder} />
                              )}
                            </td>
                            <td style={itemTitleCell}>
                              <Text style={itemTitle}>{item.name}</Text>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                    <td style={tdCenter}>
                      <Text style={itemText}>{item.quantity}</Text>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Hr style={hr} />

          {/* Next Steps */}
          <Section style={shippingSection}>
            <Heading as="h2" style={subheading}>
              What Happens Next?
            </Heading>
            <Text style={text}>
              Once approved, we will email you a printable return shipping label and instructions on how to package your items. 
              Please ensure items are in their original packaging to guarantee a smooth refund process.
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Need to organise a return? View our{' '}
              <Link href={`${baseUrl}/returns`} style={link}>
                Returns Policy
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

export default ReturnConfirmationEmail;

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
  width: '60px',
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

const thumbnailCell = {
  width: '40px',
  paddingRight: '16px',
};

const thumbnailImage = {
  width: '40px',
  height: '40px',
  objectFit: 'contain' as const,
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

const shippingSection = {
  padding: '40px 40px',
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
