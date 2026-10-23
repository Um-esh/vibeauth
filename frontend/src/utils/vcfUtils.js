/**
 * Utility functions for parsing vCard (.vcf) files and providing sample contacts.
 */

export const SAMPLE_VCF_TEXT = `BEGIN:VCARD
VERSION:3.0
FN:Sarah Connor (C-Level Executive)
ORG:Cyberdyne Systems
TITLE:Chief Information Officer
TEL;TYPE=CELL:+15550199456
EMAIL:sarah.connor@cyberdyne-enterprise.com
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:David Sterling (Legal & Compliance)
ORG:Sterling & Partners Law
TITLE:Chief Compliance Officer
TEL;TYPE=CELL:+15550177890
EMAIL:david.sterling@sterling-compliance.law
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Alex Mercer (Supportive Peer)
ORG:Core Infrastructure Team
TITLE:Lead Cloud Architect
TEL;TYPE=CELL:+447911123456
EMAIL:alex.mercer@engineering-team.internal
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Zoe Bennett (Product Designer / Gen-Z)
ORG:Growth & Design Squad
TITLE:UX Designer
TEL;TYPE=CELL:+919876543210
EMAIL:zoe.bennett@creative-studio.io
END:VCARD`;

export function parseVcfClient(vcfText) {
  if (!vcfText || typeof vcfText !== 'string') return [];

  const contacts = [];
  const cards = vcfText.split(/BEGIN:VCARD/i);

  cards.forEach((card, idx) => {
    const trimmedCard = card.trim();
    if (!trimmedCard) return;

    const rawLines = trimmedCard.split(/\r?\n/);
    const unfolded = [];
    rawLines.forEach((line) => {
      if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
        unfolded[unfolded.length - 1] += line.trim();
      } else if (line.trim()) {
        unfolded.push(line.trim());
      }
    });

    let name = '';
    const phones = [];
    const emails = [];
    let org = '';
    let title = '';

    unfolded.forEach((line) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) return;

      const keyPart = line.substring(0, colonIdx).trim().toUpperCase();
      const val = line.substring(colonIdx + 1).trim();
      if (!val) return;

      const mainKey = keyPart.split(';')[0];

      if (mainKey === 'FN') {
        name = val;
      } else if (mainKey === 'N' && !name) {
        const parts = val.split(';').map((p) => p.trim()).filter(Boolean);
        name = parts.reverse().join(' ');
      } else if (mainKey === 'TEL') {
        const cleanPhone = val.replace(/[^\d+]/g, '');
        if (cleanPhone && !phones.includes(cleanPhone)) {
          phones.push(cleanPhone);
        }
      } else if (mainKey === 'EMAIL') {
        if (val.includes('@') && !emails.includes(val)) {
          emails.push(val);
        }
      } else if (mainKey === 'ORG') {
        org = val.replace(/;/g, ' - ').trim();
      } else if (mainKey === 'TITLE') {
        title = val;
      }
    });

    if (name || phones.length > 0 || emails.length > 0) {
      contacts.push({
        id: `contact-${idx}-${Date.now()}`,
        name: name || emails[0] || phones[0] || `Contact #${idx}`,
        phone: phones[0] || '',
        allPhones: phones,
        email: emails[0] || '',
        allEmails: emails,
        org,
        title
      });
    }
  });

  return contacts;
}

export function downloadSampleVcf() {
  const blob = new Blob([SAMPLE_VCF_TEXT], { type: 'text/vcard;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'contacts.vcf');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
