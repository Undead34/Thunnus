const fs = require('fs');
const path = require('path');

function loadJson(file) {
  const content = fs.readFileSync(file, 'utf8');
  return JSON.parse(content);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function toDate(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._seconds) return new Date(value._seconds * 1000 + (value._nanoseconds || 0) / 1e6).toISOString();
  return null;
}

function deriveUserSummary(user) {
  const status = user.status || {};
  const events = user.events || [];
  const captured = user.capturedCredentials || {};

  const hasEvent = (type) => events.some((ev) => ev.type === type);

  const emailSent = !!status.emailSended || hasEvent('EMAIL_SENT');
  const openedPixel = !!status.emailOpened || hasEvent('EMAIL_OPENED');
  const linkClicked = !!status.linkClicked || hasEvent('LINK_CLICKED');
  const submitted = !!status.formSubmitted || hasEvent('SUBMIT') || Boolean(captured.email || captured.password);

  const sawEmail = openedPixel || linkClicked;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    group: user.group,
    eventsCount: events.length,
    clickCount: user.clickCount || 0,
    emailSent,
    openedPixel,
    linkClicked,
    sawEmail,
    submitted,
    capturedEmail: Boolean(captured.email),
    capturedPassword: Boolean(captured.password),
    emailOpenedAt: toDate(status.emailOpenedAt),
    firstClickAt: toDate(status.firstClickAt),
    lastClickAt: toDate(status.lastClickAt),
    lastActivityAt: toDate(status.lastActivityAt),
  };
}

function buildAggregates(summaries) {
  const totalUsers = summaries.length;
  const emailsSent = summaries.filter((u) => u.emailSent).length;
  const openedPixel = summaries.filter((u) => u.openedPixel).length;
  const linkClicked = summaries.filter((u) => u.linkClicked).length;
  const sawEmail = summaries.filter((u) => u.sawEmail).length;
  const submitted = summaries.filter((u) => u.submitted).length;
  const capturedEmail = summaries.filter((u) => u.capturedEmail).length;
  const capturedPassword = summaries.filter((u) => u.capturedPassword).length;

  const pct = (num) => (totalUsers ? Number(((num / totalUsers) * 100).toFixed(2)) : 0);
  const rate = (num, den) => (den ? Number(((num / den) * 100).toFixed(2)) : 0);

  return {
    totals: {
      totalUsers,
      emailsSent,
      openedPixel,
      linkClicked,
      sawEmail,
      submitted,
      capturedEmail,
      capturedPassword,
    },
    rates: {
      sent_vs_total: rate(emailsSent, totalUsers),
      pixel_vs_sent: rate(openedPixel, emailsSent),
      clicked_vs_sent: rate(linkClicked, emailsSent),
      saw_vs_sent: rate(sawEmail, emailsSent),
      submit_vs_sent: rate(submitted, emailsSent),
      submit_vs_clicked: rate(submitted, linkClicked),
      captured_pass_vs_sent: rate(capturedPassword, emailsSent),
      captured_pass_vs_clicked: rate(capturedPassword, linkClicked),
    },
  };
}

function main() {
  const baseDir = path.join(process.cwd(), 'data');
  const structuredDir = path.join(baseDir, 'structured');
  ensureDir(structuredDir);

  const usersPath = path.join(baseDir, 'users.json');
  const usersData = loadJson(usersPath);
  const users = usersData.phishingUsers || [];

  const summaries = users.map(deriveUserSummary);
  const aggregates = buildAggregates(summaries);

  fs.writeFileSync(path.join(structuredDir, 'users_summary.json'), JSON.stringify(summaries, null, 2));
  fs.writeFileSync(path.join(structuredDir, 'aggregates.json'), JSON.stringify(aggregates, null, 2));

  console.log('Structured files written to data/structured');
}

main();
