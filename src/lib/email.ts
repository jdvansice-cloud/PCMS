import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || "");
}

export async function sendTemplatedEmail({
  organizationId,
  templateSlug,
  recipientEmail,
  variables,
}: {
  organizationId: string;
  templateSlug: string;
  recipientEmail: string;
  variables: Record<string, string>;
}) {
  const template = await prisma.emailTemplate.findUnique({
    where: { organizationId_slug: { organizationId, slug: templateSlug } },
  });

  if (!template || !template.isActive) {
    console.warn(`Email template "${templateSlug}" not found or inactive for org ${organizationId}`);
    return null;
  }

  // Replace {{variable}} placeholders in subject and body
  let subject = template.subject;
  let bodyHtml = template.bodyHtml;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    subject = subject.replaceAll(placeholder, value);
    bodyHtml = bodyHtml.replaceAll(placeholder, value);
  }

  // Get org info for sender name
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true, email: true },
  });

  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@pcms.app";
  const fromName = org?.name || "PCMS";

  // Create email log entry
  const emailLog = await prisma.emailLog.create({
    data: {
      organizationId,
      templateId: template.id,
      recipientEmail,
      subject,
      status: "QUEUED",
    },
  });

  try {
    const result = await getResend().emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: recipientEmail,
      subject,
      html: bodyHtml,
    });

    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        resendId: result.data?.id || null,
      },
    });

    return result;
  } catch (error) {
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    console.error("Failed to send email:", error);
    return null;
  }
}

export async function seedGroomingTemplates(organizationId: string) {
  const templates = [
    {
      name: "Grooming Booking Confirmation",
      slug: "grooming-booking-confirmation",
      subject: "Booking Confirmed - {{petName}} Grooming on {{date}}",
      bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Grooming Booking Confirmed!</h2>
        <p>Hi {{ownerName}},</p>
        <p>Your grooming appointment has been confirmed:</p>
        <ul>
          <li><strong>Pet:</strong> {{petName}}</li>
          <li><strong>Services:</strong> {{services}}</li>
          <li><strong>Date:</strong> {{date}}</li>
          <li><strong>Location:</strong> {{branchName}} - {{branchAddress}}</li>
        </ul>
        {{#pickupTime}}<p><strong>Pickup Time:</strong> {{pickupTime}}</p>{{/pickupTime}}
        <p>We look forward to seeing {{petName}}!</p>
      </div>`,
      variables: ["ownerName", "petName", "services", "date", "branchName", "branchAddress", "pickupTime"],
    },
    {
      name: "Pet Ready for Pickup/Delivery",
      slug: "grooming-pet-ready",
      subject: "{{petName}} is Ready!",
      bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>{{petName}} is All Done!</h2>
        <p>Hi {{ownerName}},</p>
        <p>Great news! {{petName}}'s grooming session at {{branchName}} is complete.</p>
        {{#deliveryTime}}<p><strong>Estimated Delivery:</strong> {{deliveryTime}}</p>{{/deliveryTime}}
        {{^deliveryTime}}<p>You can come pick up {{petName}} at your convenience during business hours.</p>{{/deliveryTime}}
        <p>Thank you for choosing us!</p>
      </div>`,
      variables: ["ownerName", "petName", "branchName", "deliveryTime"],
    },
    {
      name: "Pet Delivered",
      slug: "grooming-pet-delivered",
      subject: "{{petName}} Has Been Delivered!",
      bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>{{petName}} is Home!</h2>
        <p>Hi {{ownerName}},</p>
        <p>{{petName}} has been safely delivered. We hope you love the results!</p>
        <p>Thank you for choosing our grooming service. See you next time!</p>
      </div>`,
      variables: ["ownerName", "petName"],
    },
  ];

  for (const tpl of templates) {
    await prisma.emailTemplate.upsert({
      where: { organizationId_slug: { organizationId, slug: tpl.slug } },
      update: {},
      create: {
        organizationId,
        name: tpl.name,
        slug: tpl.slug,
        subject: tpl.subject,
        bodyHtml: tpl.bodyHtml,
        variables: tpl.variables,
        isActive: true,
      },
    });
  }
}
