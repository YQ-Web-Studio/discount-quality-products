import React from 'react';
import { render } from '@react-email/render';
import OrderConfirmationEmail from '../../emails/OrderConfirmationEmail';

export default async function PreviewEmail() {
  const emailHtml = await render(<OrderConfirmationEmail />);

  return (
    <div style={{ height: '100vh', width: '100vw', margin: 0, padding: 0 }}>
      <iframe
        srcDoc={emailHtml}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        title="Email Preview"
      />
    </div>
  );
}
