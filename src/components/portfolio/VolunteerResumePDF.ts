interface ResumeData {
  name: string;
  email: string;
  joinDate: string;
  level: number;
  totalHours: number;
  tasksCompleted: number;
  impactScore: number;
  streak: number;
  causes: { cause: string; value: number; unit: "hours" | "events" }[];
  skills: { skill: string; value: number }[];
  badges: { name: string; earned: boolean; date: string | null }[];
  milestones: { title: string; achieved: boolean }[];
}

export function generateVolunteerResume(data: ResumeData) {
  const earnedBadges = data.badges.filter((badge) => badge.earned);
  const achievedMilestones = data.milestones.filter((milestone) => milestone.achieved);
  const topSkills = [...data.skills].sort((a, b) => b.value - a.value).slice(0, 6);
  const maxCauseValue = Math.max(...data.causes.map((cause) => cause.value), 1);

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Volunteer Resume - ${data.name}</title>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          color: #1a1a1a;
          background: #f5f0e8;
          display: flex;
          justify-content: center;
          padding: 32px;
        }
        .page {
          width: 800px;
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }
        .header {
          background: linear-gradient(135deg, #2d6a4f, #1b4332);
          color: #fff;
          padding: 40px 48px;
          position: relative;
        }
        .header::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 200px;
          height: 100%;
          background: radial-gradient(circle at top right, rgba(212,168,67,0.15), transparent 70%);
        }
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .header h1 {
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 4px;
        }
        .header .subtitle {
          font-size: 13px;
          opacity: 0.7;
        }
        .header .brand {
          font-size: 14px;
          font-weight: 700;
          opacity: 0.9;
          text-align: right;
        }
        .header .brand small {
          display: block;
          font-size: 10px;
          font-weight: 500;
          opacity: 0.6;
          margin-top: 2px;
        }
        .header-stats {
          display: flex;
          gap: 32px;
          margin-top: 24px;
        }
        .header-stat {
          text-align: left;
        }
        .header-stat .val {
          font-size: 28px;
          font-weight: 800;
          color: #d4a843;
        }
        .header-stat .lbl {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          opacity: 0.6;
          margin-top: 2px;
        }
        .content {
          padding: 36px 48px 48px;
        }
        .section {
          margin-bottom: 28px;
        }
        .section-title {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #2d6a4f;
          margin-bottom: 14px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e8e0d4;
        }
        .two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
        }
        .cause-row {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }
        .cause-name {
          width: 120px;
          font-size: 12px;
          font-weight: 600;
          color: #333;
        }
        .cause-bar-bg {
          flex: 1;
          height: 10px;
          background: #f0ebe3;
          border-radius: 5px;
          overflow: hidden;
        }
        .cause-bar {
          height: 100%;
          background: linear-gradient(90deg, #2d6a4f, #52b788);
          border-radius: 5px;
        }
        .cause-val {
          width: 72px;
          text-align: right;
          font-size: 11px;
          font-weight: 600;
          color: #666;
        }
        .skill-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .skill-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .skill-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #2d6a4f;
        }
        .skill-name {
          font-size: 12px;
          font-weight: 500;
          color: #333;
          flex: 1;
        }
        .skill-val {
          font-size: 11px;
          color: #888;
          font-weight: 600;
        }
        .badge-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .badge-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          background: #f0ebe3;
          font-size: 11px;
          font-weight: 600;
          color: #2d6a4f;
        }
        .badge-chip .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #d4a843;
        }
        .milestone-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .milestone-item {
          font-size: 11px;
          font-weight: 500;
          padding: 5px 12px;
          border-radius: 8px;
          background: #e8f5e9;
          color: #2d6a4f;
        }
        .footer {
          padding: 20px 48px;
          border-top: 1px solid #e8e0d4;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          color: #aaa;
        }
        .verified-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 12px;
          background: #e8f5e9;
          font-size: 10px;
          font-weight: 600;
          color: #2d6a4f;
        }
        @media print {
          body { background: #fff; padding: 0; }
          .page { box-shadow: none; border-radius: 0; width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div class="header-top">
            <div>
              <h1>${data.name}</h1>
              <div class="subtitle">Volunteer since ${data.joinDate} · Level ${data.level} · ${data.email}</div>
            </div>
            <div class="brand">
              SocioSquad
              <small>Volunteer Impact Resume</small>
            </div>
          </div>
          <div class="header-stats">
            <div class="header-stat"><div class="val">${data.totalHours}</div><div class="lbl">Volunteer Hours</div></div>
            <div class="header-stat"><div class="val">${data.tasksCompleted}</div><div class="lbl">Events Completed</div></div>
            <div class="header-stat"><div class="val">${data.impactScore}%</div><div class="lbl">Impact Score</div></div>
            <div class="header-stat"><div class="val">${data.streak}</div><div class="lbl">Day Streak</div></div>
          </div>
        </div>

        <div class="content">
          <div class="two-col">
            <div class="section">
              <div class="section-title">Cause Breakdown</div>
              ${data.causes.length > 0 ? data.causes.map((cause) => `
                <div class="cause-row">
                  <div class="cause-name">${cause.cause}</div>
                  <div class="cause-bar-bg"><div class="cause-bar" style="width: ${((cause.value / maxCauseValue) * 100).toFixed(0)}%"></div></div>
                  <div class="cause-val">${cause.unit === 'hours' ? `${cause.value}h` : `${cause.value} evt`}</div>
                </div>
              `).join('') : '<div style="font-size:12px;color:#666;">No completed impact data yet</div>'}
            </div>

            <div class="section">
              <div class="section-title">Skill Profile</div>
              <div class="skill-grid">
                ${topSkills.map((skill) => `
                  <div class="skill-item">
                    <div class="skill-dot"></div>
                    <div class="skill-name">${skill.skill}</div>
                    <div class="skill-val">${skill.value}%</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          ${earnedBadges.length > 0 ? `
          <div class="section">
            <div class="section-title">Achievement Badges</div>
            <div class="badge-grid">
              ${earnedBadges.map((badge) => `
                <div class="badge-chip"><div class="dot"></div>${badge.name}${badge.date ? ` · ${badge.date}` : ''}</div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          ${achievedMilestones.length > 0 ? `
          <div class="section">
            <div class="section-title">Milestones Achieved</div>
            <div class="milestone-list">
              ${achievedMilestones.map((milestone) => `
                <div class="milestone-item">✓ ${milestone.title}</div>
              `).join('')}
            </div>
          </div>
          ` : ''}
        </div>

        <div class="footer">
          <div>Generated on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · Resume ID: SR-${Date.now().toString(36).toUpperCase()}</div>
          <div class="verified-badge">✓ Verified by SocioSquad</div>
        </div>
      </div>
      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
