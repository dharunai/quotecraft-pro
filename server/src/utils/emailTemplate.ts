
/**
 * Wraps raw email content in a professional, spam-resistant HTML template.
 */
export function wrapInTemplate(body: string, companyName: string = 'The Genworks CRM'): string {
    const year = new Date().getFullYear();
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f9fafb;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            padding: 40px;
            background-color: #ffffff;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }
        .content {
            font-size: 16px;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
        }
        .footer p {
            margin: 5px 0;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #2563eb;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            ${body.includes('<p>') || body.includes('<br>') || body.includes('</div>') 
                ? body 
                : body.replace(/\n/g, '<br>')}
        </div>
        <div class="footer">
            <p>© ${year} ${companyName}. All rights reserved.</p>
            <p>You received this email because it was sent from your ${companyName} account.</p>
            <p>If you have questions, please contact our support team.</p>
            <p style="margin-top: 15px;">
                <a href="#" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a> | 
                <a href="#" style="color: #6b7280; text-decoration: underline;">Manage Preferences</a>
            </p>
        </div>
    </div>
</body>
</html>
    `.trim();
}
