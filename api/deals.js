export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const TOKEN = process.env.RD_TOKEN;
  const PIPELINE_ID = process.env.RD_PIPELINE_ID;
  const BASE = 'https://crm.rdstation.com/api/v1';
  try {
    const [openRes, wonRes, lostRes] = await Promise.all([
      fetch(`${BASE}/deals?token=${TOKEN}&deal_pipeline_id=${PIPELINE_ID}&limit=200`),
      fetch(`${BASE}/deals?token=${TOKEN}&deal_pipeline_id=${PIPELINE_ID}&limit=1&win=true`),
      fetch(`${BASE}/deals?token=${TOKEN}&deal_pipeline_id=${PIPELINE_ID}&limit=1&win=false`),
    ]);
    const [openData, wonData, lostData] = await Promise.all([
      openRes.json(), wonRes.json(), lostRes.json(),
    ]);
    const deals = (openData.deals || []).map(d => ({
      name: d.name,
      stage: d.deal_stage?.name || 'Sem etapa',
      last_activity_at: d.last_activity_at,
      created_at: d.created_at,
      user: d.user?.name || '—',
    }));
    res.status(200).json({
      open_total: openData.total,
      won_total: wonData.total,
      lost_total: lostData.total,
      deals,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
