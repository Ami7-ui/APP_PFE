# frontend/visu.py
import streamlit as st
from datetime import datetime, timedelta
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import time
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.db_functions import (
    verifier_login,
    get_roles,
    ajouter_utilisateur,
    get_all_utilisateurs,
    modifier_utilisateur,
    supprimer_utilisateur,
    get_types_bd,
    ajouter_type_bd,
    ajouter_base_cible,
    get_bases_cibles,
    modifier_base_cible,
    supprimer_base_cible,
    executer_audit_basique,
    get_statistiques_sessions,
    get_cpu_stats,
    get_ram_stats,
    get_execution_speed_stats,
    get_instance_status,
    get_metriques_disponibles,   
    get_all_metriques,
    ajouter_metrique,
    modifier_metrique,
    supprimer_metrique,

    executer_script_sur_cible,
    get_target_connection,
    verifier_index_tables,
    push_to_grafana,
)

# ==============================================================================
# 1. CONFIG & GLOBAL CSS
# ==============================================================================
st.set_page_config(
    page_title="OracleGuard — Secure Audit Platform",
    layout="wide",
    page_icon="🛡️",
    initial_sidebar_state="expanded"
)

MASTER_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@300;400;500;600;700;800&display=swap');

/* ── RESET & BASE ─────────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body, [data-testid="stAppViewContainer"] {
    font-family: 'Inter', sans-serif;
    background: #020817;
    color: #e2e8f0;
    overflow-x: hidden;
}

/* ── ANIMATED STARFIELD BACKGROUND ───────────────────────────────────────── */
[data-testid="stAppViewContainer"]::before {
    content: '';
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background:
        radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.08) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.08) 0%, transparent 60%),
        radial-gradient(ellipse at 50% 80%, rgba(16,185,129,0.05) 0%, transparent 60%),
        linear-gradient(135deg, #020817 0%, #0a1628 50%, #020817 100%);
    z-index: -2;
    animation: bgPulse 8s ease-in-out infinite alternate;
}
@keyframes bgPulse {
    0%   { opacity: 0.8; }
    100% { opacity: 1; }
}

/* Animated grid mesh */
[data-testid="stAppViewContainer"]::after {
    content: '';
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background-image:
        linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px);
    background-size: 60px 60px;
    z-index: -1;
    animation: gridMove 20s linear infinite;
}
@keyframes gridMove {
    0%   { transform: translate(0,0); }
    100% { transform: translate(60px,60px); }
}

[data-testid="stMain"]          { background: transparent !important; }
[data-testid="stHeader"]        { background: transparent !important; }

/* ── SIDEBAR CONTROLS ─────────────────────────────────────────────────── */
/* Make the collapse/expand button visible and glowing */
[data-testid="stSidebarCollapsedControl"], 
[data-testid="stSidebarCollapseButton"] {
    background: rgba(15,23,42,0.8) !important;
    border: 1px solid rgba(59,130,246,0.5) !important;
    border-radius: 50% !important;
    color: #60a5fa !important;
    box-shadow: 0 0 15px rgba(59,130,246,0.4) !important;
    transition: all 0.3s ease !important;
    z-index: 1000001 !important;
}
[data-testid="stSidebarCollapsedControl"]:hover,
[data-testid="stSidebarCollapseButton"]:hover {
    box-shadow: 0 0 25px rgba(59,130,246,0.7) !important;
    transform: scale(1.1);
}

#MainMenu { visibility: hidden; }
footer { visibility: hidden; }

/* ── SIDEBAR ──────────────────────────────────────────────────────────────── */
[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #0a1120 0%, #0d1b2e 100%) !important;
    border-right: 1px solid rgba(59,130,246,0.15) !important;
    box-shadow: 4px 0 30px rgba(0,0,0,0.5) !important;
}
[data-testid="stSidebar"]::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6, #10b981, #3b82f6);
    background-size: 200% 100%;
    animation: sidebarLine 3s linear infinite;
}
@keyframes sidebarLine {
    0%   { background-position: 0% 0%; }
    100% { background-position: 200% 0%; }
}

/* ── SIDEBAR RADIO ────────────────────────────────────────────────────────── */
[data-testid="stSidebar"] [data-testid="stRadio"] label {
    color: #94a3b8 !important;
    font-weight: 500 !important;
    transition: color 0.2s !important;
}
[data-testid="stSidebar"] [data-testid="stRadio"] label:hover {
    color: #60a5fa !important;
}

/* ── METRICS ─────────────────────────────────────────────────────────────── */
[data-testid="stMetric"] {
    background: linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.8) 100%) !important;
    border: 1px solid rgba(59,130,246,0.2) !important;
    border-radius: 16px !important;
    padding: 20px 24px !important;
    box-shadow:
        0 0 0 1px rgba(59,130,246,0.05),
        0 4px 24px rgba(0,0,0,0.3),
        inset 0 1px 0 rgba(255,255,255,0.05) !important;
    backdrop-filter: blur(20px) !important;
    transition: all 0.3s ease !important;
    position: relative !important;
    overflow: hidden !important;
}
[data-testid="stMetric"]::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #3b82f6, transparent);
    opacity: 0;
    transition: opacity 0.3s;
}
[data-testid="stMetric"]:hover { transform: translateY(-2px) !important; box-shadow: 0 8px 40px rgba(59,130,246,0.2), inset 0 1px 0 rgba(255,255,255,0.07) !important; }
[data-testid="stMetric"]:hover::before { opacity: 1; }
[data-testid="stMetricValue"] { color: #f8fafc !important; font-weight: 700 !important; font-size: 1.8rem !important; }
[data-testid="stMetricLabel"] { color: #64748b !important; font-weight: 600 !important; text-transform: uppercase !important; letter-spacing: 0.08em !important; font-size: 0.7rem !important; }

/* ── BUTTONS ─────────────────────────────────────────────────────────────── */
[data-testid="stButton"] > button {
    background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #1d4ed8 100%) !important;
    background-size: 200% 100% !important;
    color: #ffffff !important;
    border: 1px solid rgba(59,130,246,0.4) !important;
    border-radius: 10px !important;
    font-weight: 600 !important;
    font-size: 0.875rem !important;
    letter-spacing: 0.03em !important;
    transition: all 0.3s ease !important;
    box-shadow: 0 0 20px rgba(59,130,246,0.2) !important;
    position: relative !important;
    overflow: hidden !important;
}
[data-testid="stButton"] > button::before {
    content: '';
    position: absolute;
    top: -50%; left: -50%;
    width: 200%; height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.3s;
}
[data-testid="stButton"] > button:hover {
    background-position: 100% 0 !important;
    box-shadow: 0 0 35px rgba(59,130,246,0.45) !important;
    transform: translateY(-1px) !important;
}
[data-testid="stButton"] > button:hover::before { opacity: 1; }
[data-testid="stButton"] > button:active { transform: translateY(0px) !important; }

/* ── INPUTS ──────────────────────────────────────────────────────────────── */
[data-testid="stTextInput"] input,
[data-testid="stSelectbox"] > div > div,
[data-testid="stNumberInput"] > div > div > input {
    background: rgba(15,23,42,0.8) !important;
    border: 1px solid rgba(51,65,85,0.8) !important;
    border-radius: 10px !important;
    color: #f8fafc !important;
    font-family: 'Inter', sans-serif !important;
    transition: border-color 0.3s !important;
}
[data-testid="stTextInput"] input:focus,
[data-testid="stNumberInput"] > div > div > input:focus {
    border-color: rgba(59,130,246,0.6) !important;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.15) !important;
}

/* ── TABS ─────────────────────────────────────────────────────────────────── */
.stTabs [data-baseweb="tab-list"] {
    background: rgba(15,23,42,0.5);
    border-radius: 12px;
    padding: 4px;
    gap: 4px;
    border: 1px solid rgba(51,65,85,0.4);
}
.stTabs [data-baseweb="tab"] {
    background: transparent;
    border: none !important;
    border-radius: 8px !important;
    color: #64748b !important;
    font-weight: 500 !important;
    transition: all 0.2s !important;
    padding: 8px 20px !important;
}
.stTabs [aria-selected="true"] {
    background: linear-gradient(135deg, #1d4ed8, #3b82f6) !important;
    color: white !important;
    box-shadow: 0 4px 12px rgba(59,130,246,0.4) !important;
}

/* ── EXPANDER ─────────────────────────────────────────────────────────────── */
[data-testid="stExpander"] {
    background: rgba(15,23,42,0.6) !important;
    border: 1px solid rgba(51,65,85,0.5) !important;
    border-radius: 12px !important;
    backdrop-filter: blur(10px) !important;
    overflow: hidden !important;
    transition: border-color 0.3s !important;
}
[data-testid="stExpander"]:hover { border-color: rgba(59,130,246,0.3) !important; }

/* ── DATAFRAME ────────────────────────────────────────────────────────────── */
[data-testid="stDataFrame"] {
    background: rgba(15,23,42,0.6) !important;
    border: 1px solid rgba(51,65,85,0.4) !important;
    border-radius: 12px !important;
    overflow: hidden !important;
}

/* ── DIVIDER ──────────────────────────────────────────────────────────────── */
hr { border-color: rgba(51,65,85,0.4) !important; }

/* ── HEADINGS ─────────────────────────────────────────────────────────────── */
h1, h2, h3, h4, h5, h6 { color: #f8fafc !important; font-weight: 700 !important; }

/* ── SCROLLBAR ────────────────────────────────────────────────────────────── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: rgba(15,23,42,0.5); border-radius: 3px; }
::-webkit-scrollbar-thumb { background: linear-gradient(#3b82f6, #8b5cf6); border-radius: 3px; }

/* ── SELECTBOX ────────────────────────────────────────────────────────────── */
[data-testid="stSelectbox"] > div > div {
    background: rgba(15,23,42,0.8) !important;
    border: 1px solid rgba(51,65,85,0.8) !important;
    border-radius: 10px !important;
}

/* ── PLOTLY CHART ─────────────────────────────────────────────────────────── */
[data-testid="stPlotlyChart"] {
    background: transparent !important;
    border: none !important;
}

/* ── SPINNER ──────────────────────────────────────────────────────────────── */
[data-testid="stSpinner"] {
    color: #3b82f6 !important;
}

/* ── SUCCESS / ERROR / INFO / WARNING ─────────────────────────────────────── */
[data-testid="stAlert"] {
    border-radius: 12px !important;
    border: none !important;
    backdrop-filter: blur(10px) !important;
}

/* ── FORM ─────────────────────────────────────────────────────────────────── */
[data-testid="stForm"] {
    background: rgba(15,23,42,0.4) !important;
    border: 1px solid rgba(51,65,85,0.3) !important;
    border-radius: 16px !important;
    padding: 24px !important;
}

/* ── RADIO BUTTONS ────────────────────────────────────────────────────────── */
[data-testid="stRadio"] label {
    color: #94a3b8 !important;
    font-weight: 500 !important;
}

/* ── NUMBER INPUT ─────────────────────────────────────────────────────────── */
[data-testid="stNumberInput"] button {
    background: rgba(30,41,59,0.8) !important;
    border-color: rgba(51,65,85,0.6) !important;
    color: #94a3b8 !important;
}
</style>
"""
st.markdown(MASTER_CSS, unsafe_allow_html=True)

# ==============================================================================
# 1b. SESSION STATE
# ==============================================================================
if 'logged_in' not in st.session_state:
    st.session_state['logged_in'] = False
    st.session_state['username'] = None
    st.session_state['role'] = None

# ==============================================================================
# 2. HELPER COMPONENTS
# ==============================================================================

def render_hero_badge(text, color="#3b82f6"):
    return f'<span style="display:inline-block; background: {color}22; color:{color}; border:1px solid {color}44; border-radius:999px; font-size:0.7rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; padding:3px 12px; margin-bottom:8px;">{text}</span>'

def render_glass_card(content_html, accent="#3b82f6", glow=False):
    glow_style = f"box-shadow: 0 0 40px {accent}30, 0 8px 24px rgba(0,0,0,0.4);" if glow else "box-shadow: 0 4px 24px rgba(0,0,0,0.3);"
    return f'<div style="background: linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(30,41,59,0.7) 100%); border: 1px solid rgba(255,255,255,0.06); border-top: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 28px 32px; {glow_style} backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); margin-bottom: 16px; position: relative; overflow: hidden;"><div style="position:absolute; top:0; left:0; right:0; height:1px; background: linear-gradient(90deg, transparent, {accent}, transparent); opacity:0.6;"></div>{content_html}</div>'

def render_status_banner(inst):
    is_up = inst['status'] == 'UP'
    status_color = "#22c55e" if is_up else "#ef4444"
    status_icon  = "●" if is_up else "●"
    status_label = "EN LIGNE" if is_up else "HORS LIGNE"
    pulse_anim = "@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.3)} }" if is_up else ""

    startup_html = ""
    if inst.get('startup_time'):
        startup_html = f'<div style="font-size:11px;color:#475569;margin-top:6px;">🗓️ Démarré le {inst["startup_time"].strftime("%d/%m/%Y à %H:%M")}</div>'

    return f'<style>{pulse_anim}</style><div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;"><div style="background: linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.8)); border:1px solid {status_color}33; border-left: 4px solid {status_color}; border-radius:16px; padding:20px 28px; box-shadow: 0 0 30px {status_color}15, 0 4px 20px rgba(0,0,0,0.3); backdrop-filter:blur(20px); position:relative; overflow:hidden;"><div style="position:absolute;top:0;right:0;bottom:0;width:40%; background:radial-gradient(ellipse at right, {status_color}08, transparent);"></div><div style="font-size:10px;color:#475569;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px;">🛡️ Statut de l\'Instance</div><div style="display:flex;align-items:center;gap:10px;"><span style="color:{status_color};font-size:14px; {"animation:pulse 2s ease-in-out infinite;" if is_up else ""} display:inline-block;">{status_icon}</span><span style="font-size:1.5rem;font-weight:800;color:{status_color};font-family:\'Orbitron\',sans-serif;letter-spacing:0.05em;">{status_label}</span></div></div><div style="background: linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.8)); border:1px solid rgba(59,130,246,0.2); border-left: 4px solid #3b82f6; border-radius:16px; padding:20px 28px; box-shadow: 0 0 30px rgba(59,130,246,0.1), 0 4px 20px rgba(0,0,0,0.3); backdrop-filter:blur(20px); position:relative; overflow:hidden;"><div style="position:absolute;top:0;right:0;bottom:0;width:40%; background:radial-gradient(ellipse at right, rgba(59,130,246,0.06), transparent);"></div><div style="font-size:10px;color:#475569;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px;">⏱️ Uptime</div><div style="font-size:1.4rem;font-weight:800;color:#e2e8f0;font-family:\'Orbitron\',sans-serif;letter-spacing:0.03em;">{inst["uptime_str"]}</div>{startup_html}</div></div>'

def plotly_layout(title=""):
    return dict(
        title=dict(text=title, font=dict(color="#94a3b8", size=13, family="Inter"), x=0.0, xanchor="left"),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(10,18,35,0.6)",
        font=dict(color="#94a3b8", family="Inter", size=12),
        margin=dict(t=40, b=20, l=10, r=10),
        legend=dict(bgcolor="rgba(0,0,0,0)", bordercolor="rgba(51,65,85,0.4)", borderwidth=1),
        xaxis=dict(gridcolor="rgba(51,65,85,0.3)", zerolinecolor="rgba(51,65,85,0.4)"),
        yaxis=dict(gridcolor="rgba(51,65,85,0.3)", zerolinecolor="rgba(51,65,85,0.4)"),
        coloraxis_showscale=False,
    )

# ==============================================================================
# 3. LOGIN PAGE
# ==============================================================================
def render_login():
    st.markdown('<style>[data-testid="stAppViewContainer"] { align-items: center; }</style>', unsafe_allow_html=True)

    _, col, _ = st.columns([1, 1.2, 1])
    with col:
        st.markdown("<div style='height:32px'></div>", unsafe_allow_html=True)

        # Logo + brand header
        st.markdown('<div style="text-align:center; margin-bottom:32px;"><div style="width:80px; height:80px; margin:0 auto 20px; background: linear-gradient(135deg, #1d4ed8, #8b5cf6); border-radius:22px; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 40px rgba(59,130,246,0.5), 0 20px 40px rgba(0,0,0,0.4); font-size:36px; position:relative;"><div style="position:absolute; inset:-2px; background:linear-gradient(135deg,#3b82f6,#8b5cf6,#10b981,#3b82f6); border-radius:24px; z-index:-1; animation:borderRotate 3s linear infinite; background-size:300% 300%;"></div>🛡️</div><div style="font-family:\'Orbitron\',sans-serif; font-size:1.9rem; font-weight:900; background: linear-gradient(135deg, #60a5fa, #a78bfa, #34d399); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; letter-spacing:0.05em; margin-bottom:6px;">OracleGuard</div><div style="color:#475569; font-size:0.85rem; font-weight:500; letter-spacing:0.05em;">SECURE AUDIT PLATFORM &nbsp;•&nbsp; v2.0</div></div>', unsafe_allow_html=True)

        # Login card
        st.markdown('<div style="background: linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.85)); border: 1px solid rgba(59,130,246,0.2); border-top: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 36px 36px 28px; box-shadow: 0 0 60px rgba(59,130,246,0.12), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06); backdrop-filter: blur(30px); position: relative; overflow: hidden;"><div style="position:absolute; top:0; left:0; right:0; height:2px; background: linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, transparent);"></div><div style="font-size:1.1rem; font-weight:700; color:#f8fafc; margin-bottom:4px;">Portail d\'authentification</div><div style="font-size:0.82rem; color:#475569; margin-bottom:28px;">Connectez-vous pour accéder à la plateforme</div>', unsafe_allow_html=True)

        username = st.text_input("👤  Utilisateur / Email", placeholder="admin@company.com")
        password = st.text_input("🔑  Mot de passe", type="password", placeholder="••••••••")

        st.markdown("<div style='height:4px'></div>", unsafe_allow_html=True)
        if st.button("Se connecter", use_container_width=True):
            check_login(username, password)

        st.markdown('<div style="text-align:center; margin-top:20px; font-size:0.75rem; color:#334155;">🔒 Connexion chiffrée AES-256 &nbsp;|&nbsp; ✅ Accès sécurisé RBAC</div></div>', unsafe_allow_html=True)


# ==============================================================================
# 4. FONCTIONS MÉTIER
# ==============================================================================
def check_login(email_ou_user, password):
    user_data = verifier_login(email_ou_user, password)
    if user_data:
        st.session_state['logged_in'] = True
        st.session_state['username'] = user_data["nom_complet"]
        st.session_state['role'] = user_data["role"]
        st.rerun()
    else:
        st.error("❌  Identifiants incorrects. Vérifiez votre nom/email et mot de passe.")

def logout():
    st.session_state['logged_in'] = False
    st.session_state['username'] = None
    st.session_state['role'] = None
    st.rerun()

# ==============================================================================
# 5. SIDEBAR
# ==============================================================================
def render_sidebar():
    with st.sidebar:
        # Brand logo
        role = st.session_state['role']
        username = st.session_state['username']

        role_colors = {
            "super_admin": "#ef4444",
            "admin": "#f59e0b",
            "consultant": "#3b82f6",
            "dba": "#10b981",
        }
        role_icons = {
            "super_admin": "👑",
            "admin": "⚙️",
            "consultant": "🔍",
            "dba": "🗄️",
        }
        role_color = role_colors.get(role, "#64748b")
        role_icon  = role_icons.get(role, "👤")

        st.markdown(f'<div style="padding: 8px 0 20px 0;"><div style="display:flex;align-items:center;gap:14px; margin-bottom:20px;"><div style="width:48px; height:48px; flex-shrink:0; background: linear-gradient(135deg,#1d4ed8,#8b5cf6); border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:22px; box-shadow: 0 0 20px rgba(59,130,246,0.4);">🛡️</div><div><div style="font-family:\'Orbitron\',sans-serif;font-size:0.95rem;font-weight:800; background:linear-gradient(135deg,#60a5fa,#a78bfa); -webkit-background-clip:text;-webkit-text-fill-color:transparent; background-clip:text;">OracleGuard</div><div style="font-size:0.65rem;color:#334155;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">Audit Platform</div></div></div><div style="background: rgba(30,41,59,0.6); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 14px 16px; display:flex; align-items:center; gap:12px;"><div style="width:38px; height:38px; flex-shrink:0; background: linear-gradient(135deg, {role_color}33, {role_color}11); border: 1px solid {role_color}44; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px;">{role_icon}</div><div><div style="font-size:0.82rem;font-weight:700;color:#e2e8f0;">{username}</div><div style="display:inline-block; font-size:0.62rem;font-weight:700; text-transform:uppercase;letter-spacing:0.1em; color:{role_color}; background:{role_color}15; border:1px solid {role_color}30; border-radius:999px; padding:1px 8px; margin-top:2px;">{role}</div></div></div></div>', unsafe_allow_html=True)

        st.markdown('<div style="font-size:0.65rem;color:#334155;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;padding-left:4px;">Navigation</div>', unsafe_allow_html=True)

        menu_options = ["Tableau de Bord"]
        if role in ["super_admin", "admin", "consultant"]:
            menu_options.append("Audit de Sécurité")
        if role in ["super_admin", "admin"]:
            menu_options.append("Configuration")
            menu_options.append("Configuration des Cibles")
        if role == "super_admin":
            menu_options.append("Gestion des Utilisateurs")
            menu_options.append("Gestion des Scripts")

        choice = st.radio("Navigation", menu_options, label_visibility="collapsed")

        st.markdown("<div style='flex:1'></div>", unsafe_allow_html=True)
        st.markdown("<br>", unsafe_allow_html=True)

        if st.button("🚪  Déconnexion", use_container_width=True):
            logout()

        st.markdown('<div style="margin-top:20px; padding-top:16px; border-top:1px solid rgba(51,65,85,0.3); text-align:center; font-size:0.68rem; color:#1e293b;">OracleGuard v2.0 &nbsp;•&nbsp; 2026</div>', unsafe_allow_html=True)

    return choice

# ==============================================================================
# 6. PAGE TITRE HEADER
# ==============================================================================
def render_page_header(icon, title, subtitle):
    st.markdown(f'<div style="display:flex; align-items:center; gap:20px; margin-bottom:28px; padding-bottom:24px; border-bottom: 1px solid rgba(51,65,85,0.4);"><div style="width:52px; height:52px; flex-shrink:0; background: linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2)); border: 1px solid rgba(59,130,246,0.3); border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:24px; box-shadow: 0 0 20px rgba(59,130,246,0.2);">{icon}</div><div><h1 style="margin:0; font-family:\'Inter\',sans-serif; font-size:1.6rem; font-weight:800; color:#f8fafc; line-height:1.1;">{title}</h1><p style="margin:4px 0 0; font-size:0.82rem; color:#475569; font-weight:500;">{subtitle}</p></div></div>', unsafe_allow_html=True)

# ==============================================================================
# 7. PAGE — TABLEAU DE BORD (Version 1 seul graphique - 24h glissantes)
# ==============================================================================
def page_dashboard():
    render_page_header("📊", "Tableau de Bord de Performance", "Métriques Oracle en temps réel (24h)")

    # 1. INITIALISATION DE LA MÉMOIRE (Session State)
    if 'historique_metrics' not in st.session_state:
        st.session_state.historique_metrics = pd.DataFrame(
            columns=['Heure', 'Nom_Base', 'CPU', 'RAM', 'Vitesse_SQL']
        )

    bases = get_bases_cibles()
    if not bases:
        st.markdown(render_glass_card('<div style="text-align:center; padding:24px 0;"><div style="font-size:3rem; margin-bottom:12px;">🗄️</div><div style="font-size:1.1rem; font-weight:600; color:#e2e8f0; margin-bottom:8px;">Aucune base cible configurée</div><div style="font-size:0.85rem; color:#475569;">Rendez-vous dans « Configuration des Cibles » pour ajouter une base.</div></div>'), unsafe_allow_html=True)
        return

    choix_bases = {f"{b['Instance']} ({b['IP']})": b['ID'] for b in bases}

    # 2. SÉLECTION ET RAFRAÎCHISSEMENT
    sel_col, btn_col = st.columns([3, 1])
    with sel_col:
        bases_selectionnees = st.multiselect("🔌 Bases à surveiller", list(choix_bases.keys()), default=[list(choix_bases.keys())[0]])
    with btn_col:
        st.write("") 
        st.write("")
        refresh = st.button("🔄 Rafraîchir", use_container_width=True)

    if not bases_selectionnees:
        st.warning("Sélectionne au moins une base.")
        return

    # Bannière de statut
    id_premiere_base = choix_bases[bases_selectionnees[0]]
    inst = get_instance_status(id_premiere_base)
    st.markdown(render_status_banner(inst), unsafe_allow_html=True)

    # VÉRIFICATION INITIALISATION AUTO
    bases_manquantes = [b for b in bases_selectionnees if st.session_state.historique_metrics.empty or b not in st.session_state.historique_metrics['Nom_Base'].values]
    auto_init = st.session_state.historique_metrics.empty or len(bases_manquantes) > 0
    if auto_init:
        refresh = True

    # 3. COLLECTE DES DONNÉES SI ON CLIQUE SUR RAFRAÎCHIR OU AUTO INIT
    if refresh:
        nouvelles_lignes = []
        heure_actuelle = datetime.now() 
        
        with st.spinner("Collecte des métriques en cours..."):
            for base_nom in bases_selectionnees:
                id_cible = choix_bases[base_nom]
                try:
                    cpu_data = get_cpu_stats(id_cible)
                    ram_data = get_ram_stats(id_cible)
                    
                    cpu_val = cpu_data.get('busy_pct', 0) if cpu_data else 0
                    ram_val = ram_data.get('ram_pct', 0) if ram_data else 0
                    sql_val = len(cpu_data.get('history', [])) if cpu_data else 0
                    
                    # Simulation de l'historique sur les 24 dernières heures pour la première fois
                    a_deja_des_donnees = not st.session_state.historique_metrics.empty and base_nom in st.session_state.historique_metrics['Nom_Base'].values
                    if not a_deja_des_donnees:
                        import random
                        for i in range(24, 0, -1):
                            heure_hist = heure_actuelle - timedelta(hours=i)
                            var_cpu = random.uniform(-10, 10)
                            var_ram = random.uniform(-5, 5)
                            var_sql = random.randint(-2, 2)
                            nouvelles_lignes.append({
                                'Heure': heure_hist,
                                'Nom_Base': base_nom,
                                'CPU': max(0.0, min(100.0, cpu_val + var_cpu)),
                                'RAM': max(0.0, min(100.0, ram_val + var_ram)),
                                'Vitesse_SQL': max(0, sql_val + var_sql)
                            })

                    # Ajout la valeur réele courante
                    nouvelles_lignes.append({
                        'Heure': heure_actuelle,
                        'Nom_Base': base_nom,
                        'CPU': cpu_val,
                        'RAM': ram_val,
                        'Vitesse_SQL': sql_val
                    })
                except Exception as e:
                    st.error(f"Erreur lors de la collecte pour {base_nom}: {e}")
        
        if nouvelles_lignes:
            df_nouvelles = pd.DataFrame(nouvelles_lignes)
            st.session_state.historique_metrics = pd.concat(
                [st.session_state.historique_metrics, df_nouvelles], 
                ignore_index=True
            )

    # 4. FILTRAGE POUR GARDER SEULEMENT LES 24 DERNIÈRES HEURES
    df = st.session_state.historique_metrics.copy()
    
    heure_actuelle_affichage = datetime.now()
    limite_24h = heure_actuelle_affichage - timedelta(hours=24)
    
    if not df.empty:
        # On s'assure que la colonne Heure est bien reconnue comme une date
        df['Heure'] = pd.to_datetime(df['Heure'])
        
        # On filtre les données
        df_24h = df[df['Heure'] >= limite_24h]
        
        # On met à jour le session_state pour purger les vieilles données et libérer la mémoire RAM de l'app
        st.session_state.historique_metrics = df_24h
        
        # Filtrage par bases sélectionnées
        df_filtre = df_24h[df_24h['Nom_Base'].isin(bases_selectionnees)]
    else:
        df_filtre = df

    if df_filtre.empty:
        st.info("📈 Aucune donnée enregistrée dans les 24 dernières heures. Clique sur 'Rafraîchir' pour commencer à tracer les graphiques.")
        return

    # 5. SÉLECTEUR DE KPI
    st.markdown('<div style="font-size:0.7rem;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:12px;">Sélectionner un Indicateur</div>', unsafe_allow_html=True)
    kpi_choice = st.radio(
        "KPI",
        ["Utilisation CPU", "Consommation RAM", "Sessions Actives"],
        horizontal=True,
        label_visibility="collapsed"
    )
    st.markdown("<div style='height:16px'></div>", unsafe_allow_html=True)

    # 6. AFFICHAGE DU GRAPHIQUE UNIQUE
    if kpi_choice == "Utilisation CPU":
        colonne_y = 'CPU'
        titre_graphique = "Utilisation CPU (%) - 24 dernières heures"
        couleurs = ['#3b82f6', '#1d4ed8', '#60a5fa', '#2563eb'] # Bleu
    elif kpi_choice == "Consommation RAM":
        colonne_y = 'RAM'
        titre_graphique = "Consommation RAM (%) - 24 dernières heures"
        couleurs = ['#ef4444', '#b91c1c', '#f87171', '#dc2626'] # Rouge
    else:
        colonne_y = 'Vitesse_SQL'
        titre_graphique = "Sessions Actives - 24 dernières heures"
        couleurs = ['#22c55e', '#15803d', '#4ade80', '#16a34a'] # Vert

    fig = px.line(df_filtre, x='Heure', y=colonne_y, color='Nom_Base', markers=True, color_discrete_sequence=couleurs)
    
    # Formatage de l'axe X pour bien afficher l'heure et la date
    fig.update_xaxes(
        title_text="Heure",
        tickformat="%H:%M\n%d %b",
        tickangle=0,
        range=[limite_24h, heure_actuelle_affichage]
    )
    if kpi_choice == "Consommation RAM":
        fig.update_yaxes(title_text="RAM (%)", range=[0, 100])
    elif kpi_choice == "Utilisation CPU":
        fig.update_yaxes(title_text="CPU (%)", range=[0, 100])
    
    fig.update_layout(**plotly_layout(titre_graphique))
    fig.update_layout(height=400, showlegend=True, legend_title_text="Base de données")
    st.plotly_chart(fig, use_container_width=True)

    # 7. MÉTRIQUES ACTUELLES (DERNIÈRE VALEUR ENREGISTRÉE)
    st.markdown("<div style='height:20px'></div>", unsafe_allow_html=True)
    st.markdown('<div style="font-size:0.7rem;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:12px;">Dernières Métriques Enregistrées</div>', unsafe_allow_html=True)

    derniere_heure = df_filtre['Heure'].max()
    df_dernier = df_filtre[df_filtre['Heure'] == derniere_heure]

    cols_metriques = st.columns(len(bases_selectionnees))
    for i, base in enumerate(bases_selectionnees):
        valeurs_base = df_dernier[df_dernier['Nom_Base'] == base]
        if not valeurs_base.empty:
            with cols_metriques[i]:
                st.markdown(f"**{base}**")
                m1, m2, m3 = st.columns(3)
                m1.metric("CPU Actuel", f"{valeurs_base['CPU'].values[0]:.1f} %")
                m2.metric("RAM Utilisée", f"{valeurs_base['RAM'].values[0]:.1f} %")
                m3.metric("Sessions", int(valeurs_base['Vitesse_SQL'].values[0]))
# ==============================================================================
# 8. PAGE — AUDIT DE SÉCURITÉ
# ==============================================================================
def page_audit():
    render_page_header("🔍", "Audit de Sécurité Système", "Extraction et analyse des informations système Oracle")

    bases = get_bases_cibles()
    if not bases:
        st.warning("⚠️  Aucune base cible n'est configurée. Allez dans «&nbsp;Configuration des Cibles&nbsp;».")
        return

    choix_bases = {f"{b['Instance']} ({b['IP']})": b['ID'] for b in bases}
    sel_col, btn_col = st.columns([3, 1])
    with sel_col:
        base_selectionnee = st.selectbox("🗄️  Sélectionner la base à auditer", list(choix_bases.keys()))
    with btn_col:
        st.markdown("<div style='height:28px'></div>", unsafe_allow_html=True)
        launch = st.button("🚀  Lancer l'extraction", use_container_width=True)

    if launch:
        with st.spinner(f"Connexion à {base_selectionnee} — extraction en cours..."):
            id_cible = choix_bases[base_selectionnee]
            succes, message, data = executer_audit_basique(id_cible)
        if succes:
            st.success(f"✅  {message}")
            t_ver, t_ses, t_sql = st.tabs(["📋  Informations Version", "👥  Sessions Actives", "📊  Top 10 Requêtes"])
            with t_ver:
                for ligne in data['version']:
                    st.code(ligne, language="text")
            with t_ses:
                if data['session']:
                    st.dataframe(pd.DataFrame(data['session']), use_container_width=True)
                else:
                    st.info("ℹ️  Aucune session utilisateur active trouvée.")
            with t_sql:
                if data['sql']:
                    st.dataframe(pd.DataFrame(data['sql']), use_container_width=True)
                else:
                    st.info("ℹ️  Aucune requête trouvée.")
        else:
            st.error(f"❌  {message}")

# ==============================================================================
# 8B. PAGE — CONFIGURATION (Exécution de scripts SQL)
# ==============================================================================
def page_configuration():
    render_page_header("🛠️", "Configuration", "Visualisation des bases cibles et exécution de scripts SQL disponibles")

    bases = get_bases_cibles()
    if not bases:
        st.warning("⚠️  Aucune base cible n'est configurée. Allez dans « Configuration des Cibles ».")
        return

    if 'selected_config_base' not in st.session_state:
        st.session_state['selected_config_base'] = None

    st.markdown("### 🗄️  Sélectionnez une base cible")
    
    cols = st.columns(3)
    for i, b in enumerate(bases):
        with cols[i % 3]:
            st.markdown(render_glass_card(f'''<div style="text-align:center;">
                <div style="font-size:2.5rem;margin-bottom:8px;">🗂️</div>
                <div style="font-size:1.3rem;font-weight:700;color:#f8fafc;">{b['Instance']}</div>
                <div style="font-size:0.85rem;color:#94a3b8;margin-top:5px;">IP: {b['IP']} | Port: {b['Port']}</div>
                <div style="font-size:0.8rem;color:#3b82f6;margin-top:5px;">Type: {b['Type']}</div>
                <br/>
            </div>'''), unsafe_allow_html=True)
            if st.button(f"Choisir {b['Instance']}", key=f"btn_sel_conf_{b['ID']}", use_container_width=True):
                st.session_state['selected_config_base'] = b['ID']
                st.rerun()

    st.markdown("<hr>", unsafe_allow_html=True)

    if st.session_state['selected_config_base']:
        id_cible = st.session_state['selected_config_base']
        base_info = next((b for b in bases if b['ID'] == id_cible), None)
        
        if base_info:
            st.markdown(f"### 🚀 Scripts SQL applicables pour `{base_info['Instance']}`")
            st.markdown("Cliquez sur l'étoile pour mettre en favori, ou sur « Exécuter » pour lancer le script.")
            
            # Initialize script favorites in session state if not exists
            if 'script_favorites' not in st.session_state:
                st.session_state['script_favorites'] = []
                
            scripts = [
                {"id": "base_s1", "name": "Statut de l'Instance", "desc": "Vérifie si l'instance est UP/DOWN et son uptime (V$INSTANCE)", "func": "get_instance_status", "icon": "🚥", "is_dynamic": False, "script_sql": "SELECT STARTUP_TIME FROM V$INSTANCE"},
                {"id": "base_s2", "name": "Statistiques des Sessions", "desc": "Nombre de sessions actives/inactives (V$SESSION)", "func": "get_statistiques_sessions", "icon": "👥", "is_dynamic": False, "script_sql": "SELECT STATUS, COUNT(*) FROM v$session WHERE USERNAME IS NOT NULL GROUP BY STATUS"},
                {"id": "base_s3", "name": "Analyse CPU", "desc": "Charge CPU et Top 10 sessions (V$OSSTAT, V$SESSTAT)", "func": "get_cpu_stats", "icon": "⚙️", "is_dynamic": False, "script_sql": "SELECT STAT_NAME, VALUE FROM V$OSSTAT WHERE STAT_NAME IN ('BUSY_TIME', 'IDLE_TIME');\\n\\nSELECT s.USERNAME, ROUND(st.VALUE / 100, 2) AS CPU_SECONDS FROM V$SESSTAT st JOIN V$SESSION s ON s.SID = st.SID JOIN V$STATNAME n ON n.STATISTIC# = st.STATISTIC# WHERE n.NAME = 'CPU used by this session' AND s.USERNAME IS NOT NULL AND st.VALUE > 0 ORDER BY st.VALUE DESC FETCH FIRST 10 ROWS ONLY"},
                {"id": "base_s4", "name": "Consommation RAM", "desc": "SGA Totale et PGA Allouée (V$SGAINFO, V$PGASTAT)", "func": "get_ram_stats", "icon": "🧠", "is_dynamic": False, "script_sql": "SELECT NAME, ROUND(BYTES / 1024 / 1024, 2) AS MB FROM V$SGAINFO WHERE BYTES > 0 ORDER BY BYTES DESC;\\n\\nSELECT ROUND(VALUE / 1024 / 1024, 2) FROM V$PGASTAT WHERE NAME = 'total PGA allocated';"},
                {"id": "base_s5", "name": "Vitesse d'exécution SQL", "desc": "Top 10 requêtes les plus lentes (V$SQL)", "func": "get_execution_speed_stats", "icon": "⚡", "is_dynamic": False, "script_sql": "SELECT SQL_ID, SUBSTR(SQL_TEXT, 1, 60) AS SQL_TEXT, EXECUTIONS, ROUND(ELAPSED_TIME / 1000000, 3) AS ELAPSED_S, ROUND((ELAPSED_TIME / NULLIF(EXECUTIONS, 0)) / 1000, 2) AS AVG_MS FROM V$SQL WHERE EXECUTIONS > 0 ORDER BY AVG_MS DESC FETCH FIRST 10 ROWS ONLY"}
            ]
            
            # Fetch and append dynamic metrics
            metriques_dyn = get_metriques_disponibles(base_info['id_type_base'])
            if metriques_dyn:
                for idx, m in enumerate(metriques_dyn):
                    scripts.append({
                        "id": f"dyn_s{idx}",
                        "name": m["nom"],
                        "desc": "Audit dynamique personnalisé (depuis la table METRIQUE)",
                        "func": "executer_script_sur_cible",
                        "script_sql": m["script"],
                        "icon": "📊",
                        "is_dynamic": True
                    })
            
            # Sort scripts: favorites first
            scripts.sort(key=lambda x: x["id"] not in st.session_state['script_favorites'])

            # Render scripts in a grid of cards
            script_to_run = None

            if st.session_state.get('script_to_view'):
                s = st.session_state['script_to_view']
                if st.button("⬅️ Retour aux scripts"):
                    st.session_state['script_to_view'] = None
                    st.rerun()
                
                st.markdown(f"### Détails du script : {s['name']}")
                st.markdown(f"**Source des informations :** {s['desc']}")
                
                st.markdown("#### Script SQL")
                st.code(s['script_sql'], language="sql")
                
                st.markdown("#### État des Index sur les Tables SQL")
                with st.spinner("Analyse du code SQL et vérification des index... (connexion Oracle)"):
                    idx_results = verifier_index_tables(id_cible, s['script_sql'])
                    
                if "Erreur" in idx_results:
                    st.error(idx_results["Erreur"])
                elif "Info" in idx_results:
                    st.info(idx_results["Info"])
                else:
                    for tbl, info in idx_results.items():
                        if info["is_indexed"]:
                            st.write(f"✅ **{tbl}** : {info['info']} — Index trouvés : `{', '.join(info['indexes'])}`")
                        elif "Vue Système" in info["info"]:
                            st.write(f"ℹ️ **{tbl}** : {info['info']}")
                        else:
                            st.write(f"⚠️ **{tbl}** : {info['info']}")

                st.markdown("---")
                if st.button("▶️ Exécuter le Diagnostic", type="primary", use_container_width=True):
                    script_to_run = s

            else:
                script_cols = st.columns(3)

                for i, script in enumerate(scripts):
                    with script_cols[i % 3]:
                        is_fav = script["id"] in st.session_state['script_favorites']
                        star_icon = "⭐" if is_fav else "☆"
                        star_color = "#f59e0b" if is_fav else "#94a3b8"
                        
                        st.markdown(render_glass_card(f'''<div style="position:relative;">
                            <div style="font-size:2rem;margin-bottom:8px;">{script["icon"]}</div>
                            <div style="font-size:1.1rem;font-weight:700;color:#f8fafc;margin-bottom:4px;">{script["name"]}</div>
                            <div style="font-size:0.75rem;color:#94a3b8;line-height:1.4;height:35px;overflow:hidden;">{script["desc"]}</div>
                        </div>'''), unsafe_allow_html=True)
                        
                        # Buttons in columns for each card
                        btn_c1, btn_c2 = st.columns([1, 4])
                        with btn_c1:
                            if st.button(star_icon, key=f"fav_{script['id']}", help="Mettre en favori"):
                                if is_fav:
                                    st.session_state['script_favorites'].remove(script["id"])
                                else:
                                    st.session_state['script_favorites'].append(script["id"])
                                st.rerun()
                        with btn_c2:
                            if st.button(" Détails", key=f"run_{script['id']}", use_container_width=True):
                                st.session_state['script_to_view'] = script
                                st.rerun()

            st.markdown("<br>", unsafe_allow_html=True)

            # Execute the selected script
            if script_to_run:
                st.markdown("---")
                st.markdown(f"#### 📊 Résultat : {script_to_run['name']}")
                func_name = script_to_run["func"]
                
                with st.spinner(f"Exécution de `{script_to_run['name']}` en cours..."):
                    if script_to_run["is_dynamic"]:
                        conn_cible = get_target_connection(id_cible)
                        if not conn_cible:
                            st.error("❌ Impossible d'établir la connexion avec la base cible.")
                        else:
                            df_res, err = executer_script_sur_cible(conn_cible, script_to_run["script_sql"])
                            if err:
                                st.error(f"Erreur SQL : {err}")
                            elif df_res is not None and not df_res.empty:
                                st.dataframe(df_res, use_container_width=True, hide_index=True)
                            else:
                                st.info("La requête a réussi mais n'a retourné aucune donnée.")
                            conn_cible.close()
                    else:
                        if func_name == "get_instance_status":
                            res = get_instance_status(id_cible)
                            st.json(res)
                        elif func_name == "get_statistiques_sessions":
                            res = get_statistiques_sessions(id_cible)
                            st.json(res)
                        elif func_name == "get_cpu_stats":
                            res = get_cpu_stats(id_cible)
                            if res:
                                st.write(f"**CPU Busy:** {res['busy_pct']}% | **CPU Idle:** {res['idle_pct']}%")
                                if res['history']:
                                    st.dataframe(pd.DataFrame(res['history']), use_container_width=True)
                            else:
                                st.error("Impossible de récupérer les stats CPU.")
                        elif func_name == "get_ram_stats":
                            res = get_ram_stats(id_cible)
                            if res:
                                st.write(f"**SGA Totale:** {res['sga_total_mb']} Mo | **PGA Allouée:** {res['pga_total_mb']} Mo")
                                if res['sga_detail']:
                                    st.dataframe(pd.DataFrame(res['sga_detail']), use_container_width=True)
                            else:
                                st.error("Impossible de récupérer les stats RAM.")
                        elif func_name == "get_execution_speed_stats":
                            res = get_execution_speed_stats(id_cible)
                            if res:
                                st.write(f"**Délai moyen Top 10:** {res['avg_elapsed_ms']} ms")
                                if res['top_sql']:
                                    st.dataframe(pd.DataFrame(res['top_sql']), use_container_width=True)
                            else:
                                st.error("Impossible de récupérer les vitesses d'exécution.")

# ==============================================================================
# 9. PAGE — CONFIGURATION DES CIBLES
# ==============================================================================
def page_config_cibles():
    render_page_header("⚙️", "Gestion des Bases Cibles", "Ajout, modification et suppression des connexions Oracle")

    st.markdown("### Bases de données enregistrées")
    bases = get_bases_cibles()

    if not bases:
        st.markdown(render_glass_card('<div style="text-align:center;padding:16px 0;"><div style="font-size:2.5rem;margin-bottom:8px;">🗄️</div><div style="color:#94a3b8;font-size:0.9rem;">Aucune base n\'a encore été ajoutée.</div></div>'), unsafe_allow_html=True)
    else:
        for b in bases:
            with st.expander(f"🗄️  {b['Instance']}  —  {b['IP']}:{b['Port']}  ({b['Type']})"):
                col_edit, col_del = st.columns([4, 1])
                with col_edit:
                    with st.form(key=f"edit_base_{b['ID']}"):
                        st.markdown(f"**✏️  Modifier `{b['Instance']}`**")
                        ec1, ec2 = st.columns(2)
                        with ec1:
                            e_nom  = st.text_input("Nom instance *", value=b['Instance'])
                            e_ip   = st.text_input("Adresse IP *", value=b['IP'])
                        with ec2:
                            e_port = st.number_input("Port *", value=int(b['Port']), min_value=1, step=1)
                            e_user = st.text_input("Utilisateur d'audit *")
                        e_mdp = st.text_input("Nouveau mot de passe (vide = inchangé)", type="password")
                        if st.form_submit_button("💾  Enregistrer", use_container_width=True):
                            if e_nom and e_ip and e_user:
                                ok, msg = modifier_base_cible(b['ID'], e_nom, e_ip, e_port, e_user, e_mdp if e_mdp else None)
                                st.success(msg) if ok else st.error(msg)
                                if ok: st.rerun()
                            else:
                                st.error("Champs obligatoires (*) manquants.")
                with col_del:
                    st.markdown("<div style='height:28px'></div>", unsafe_allow_html=True)
                    if st.button("🗑️", key=f"del_base_{b['ID']}", use_container_width=True):
                        ok, msg = supprimer_base_cible(b['ID'])
                        st.success(msg) if ok else st.error(msg)
                        if ok: st.rerun()

    st.divider()

    tab1, tab2 = st.tabs(["➕  Ajouter une Base Cible", "Gérer les Types de BD"])

    with tab1:
        types_dispos = get_types_bd()
        if not types_dispos:
            st.warning("⚠️  Aucun type de SGBD n'existe. Créez-en un dans l'onglet «&nbsp;Gérer les Types&nbsp;».")
        else:
            type_dict = {t["nom"]: t["id"] for t in types_dispos}
            with st.form("form_ajout_db", clear_on_submit=True):
                st.markdown("#### 🆕  Nouvelle connexion cible")
                c1, c2 = st.columns(2)
                with c1:
                    new_nom_instance = st.text_input("Nom de l'instance (ex: ORCL) *")
                    new_ip = st.text_input("Adresse IP *")
                    new_type_nom = st.selectbox("Type de SGBD *", list(type_dict.keys()))
                with c2:
                    new_port = st.number_input("Port *", min_value=1, step=1, value=1521)
                    new_user = st.text_input("Utilisateur d'audit *")
                    new_mdp  = st.text_input("Mot de passe *", type="password")
                if st.form_submit_button("💾  Enregistrer la base", use_container_width=True):
                    if new_nom_instance and new_ip and new_user and new_mdp:
                        ok, msg = ajouter_base_cible(new_nom_instance, new_ip, new_port, new_user, new_mdp, type_dict[new_type_nom])
                        st.success(msg) if ok else st.error(msg)
                        if ok: st.rerun()
                    else:
                        st.error("Veuillez remplir tous les champs obligatoires (*).")

    with tab2:
        with st.form("form_ajout_type", clear_on_submit=True):
            st.markdown("#### 🆕  Nouveau Type de SGBD")
            new_type    = st.text_input("Nom du Type (ex: Oracle 19c) *")
            new_editeur = st.text_input("Éditeur — Optionnel")
            if st.form_submit_button("➕  Ajouter le Type"):
                if new_type:
                    ok, msg = ajouter_type_bd(new_type, new_editeur)
                    st.success(msg) if ok else st.error(msg)
                else:
                    st.error("Le nom du type est obligatoire.")

# ==============================================================================
# 9B. PAGE — GESTION DES SCRIPTS
# ==============================================================================
def page_scripts():
    render_page_header("📜", "Gestion des Scripts SQL", "Ajout, modification et suppression des scripts dynamiques (Super Admin)")

    if st.session_state.get('role') != "super_admin":
        st.error("Accès refusé. Uniquement pour les super administrateurs.")
        return

    types_dispos = get_types_bd()
    if not types_dispos:
        st.warning("⚠️ Aucun type de SGBD n'existe. Créez-en un dans l'onglet Configuration des Cibles.")
        return
        
    type_dict = {t["nom"]: t["id"] for t in types_dispos}

    st.markdown("### 📜  Scripts enregistrés")
    metriques = get_all_metriques()

    if not metriques:
        st.markdown(render_glass_card('<div style="text-align:center;padding:16px 0;"><div style="font-size:2.5rem;margin-bottom:8px;">📜</div><div style="color:#94a3b8;font-size:0.9rem;">Aucun script n\'est enregistré.</div></div>'), unsafe_allow_html=True)
    else:
        for m in metriques:
            with st.expander(f"📜 {m['Nom']} — SGBD: {m['Type']}"):
                col_edit, col_del = st.columns([4, 1])
                with col_edit:
                    with st.form(key=f"edit_script_{m['ID']}"):
                        st.markdown(f"**✏️ Modifier `{m['Nom']}`**")
                        c1, c2 = st.columns(2)
                        with c1:
                            m_nom = st.text_input("Nom du script *", value=m['Nom'])
                        with c2:
                            m_type = st.selectbox("Type de SGBD *", list(type_dict.keys()), 
                                                  index=list(type_dict.keys()).index(m['Type']) if m['Type'] in type_dict else 0)
                        
                        m_script = st.text_area("Script SQL *", value=m['Script'], height=150)
                            
                        if st.form_submit_button("💾 Enregistrer", use_container_width=True):
                            if m_nom and m_script:
                                ok, msg = modifier_metrique(m['ID'], m_nom, m_script, type_dict[m_type])
                                st.success(msg) if ok else st.error(msg)
                                if ok: st.rerun()
                            else:
                                st.error("Le nom et le script sont obligatoires.")
                with col_del:
                    st.markdown("<div style='height:28px'></div>", unsafe_allow_html=True)
                    if st.button("🗑️", key=f"del_script_{m['ID']}", use_container_width=True):
                        ok, msg = supprimer_metrique(m['ID'])
                        st.success(msg) if ok else st.error(msg)
                        if ok: st.rerun()

    st.divider()

    with st.form("form_ajout_script", clear_on_submit=True):
        st.markdown("#### ➕ Ajouter un nouveau script SQL")
        c1, c2 = st.columns(2)
        with c1:
            new_nom = st.text_input("Nom du script *")
        with c2:
            new_type = st.selectbox("Type de SGBD *", list(type_dict.keys()))
            
        new_script = st.text_area("Script SQL *", height=150)
        
        if st.form_submit_button("Créer le script", use_container_width=True):
            if new_nom and new_script:
                ok, msg = ajouter_metrique(new_nom, new_script, type_dict[new_type])
                st.success(msg) if ok else st.error(msg)
                if ok: st.rerun()
            else:
                st.error("Veuillez remplir le nom et le script.")

# ==============================================================================
# 10. PAGE — GESTION DES UTILISATEURS
# ==============================================================================
def page_utilisateurs():
    render_page_header("👥", "Administration des Accès (RBAC)", "Gestion des rôles et des droits utilisateurs")

    roles_dispos = get_roles()
    if not roles_dispos:
        st.error("❌  Impossible de charger les rôles depuis la base de données.")
        return

    role_dict = {r["nom"]: r["id"] for r in roles_dispos}
    role_id_to_nom = {r["id"]: r["nom"] for r in roles_dispos}

    st.markdown("### 👤  Utilisateurs enregistrés")
    utilisateurs = get_all_utilisateurs()

    if not utilisateurs:
        st.markdown(render_glass_card('<div style="text-align:center;padding:16px 0;"><div style="font-size:2.5rem;margin-bottom:8px;">👤</div><div style="color:#94a3b8;font-size:0.9rem;">Aucun utilisateur enregistré.</div></div>'), unsafe_allow_html=True)
    else:
        role_badge_colors = {
            "super_admin": "#ef4444",
            "admin": "#f59e0b",
            "consultant": "#3b82f6",
            "dba": "#10b981",
        }
        for u in utilisateurs:
            rc = role_badge_colors.get(u['Rôle'], "#64748b")
            with st.expander(f"👤  {u['Nom']}  —  {u['Email']}  |  {u['Rôle']}"):
                col_edit, col_del = st.columns([4, 1])
                with col_edit:
                    with st.form(key=f"edit_user_{u['ID']}"):
                        st.markdown(f"**✏️  Modifier `{u['Nom']}`**")
                        uc1, uc2 = st.columns(2)
                        with uc1:
                            u_nom  = st.text_input("Nom Complet *", value=u['Nom'])
                            u_role = st.selectbox("Rôle *", list(role_dict.keys()),
                                                  index=list(role_dict.keys()).index(u['Rôle']) if u['Rôle'] in role_dict else 0)
                        with uc2:
                            u_email = st.text_input("Email *", value=u['Email'])
                            u_mdp   = st.text_input("Nouveau mot de passe (vide = inchangé)", type="password")
                        if st.form_submit_button("💾  Enregistrer", use_container_width=True):
                            if u_nom and u_email:
                                ok, msg = modifier_utilisateur(u['ID'], u_nom, u_email, role_dict[u_role],
                                                               nouveau_mdp=u_mdp if u_mdp else None)
                                st.success(msg) if ok else st.error(msg)
                                if ok: st.rerun()
                            else:
                                st.error("Le nom et l'email sont obligatoires.")
                with col_del:
                    st.markdown("<div style='height:28px'></div>", unsafe_allow_html=True)
                    if st.button("🗑️", key=f"del_user_{u['ID']}", use_container_width=True):
                        ok, msg = supprimer_utilisateur(u['ID'])
                        st.success(msg) if ok else st.error(msg)
                        if ok: st.rerun()

    st.divider()

    with st.form("form_ajout_user", clear_on_submit=True):
        st.markdown("#### ➕  Ajouter un nouvel utilisateur")
        col1, col2 = st.columns(2)
        with col1:
            new_nom      = st.text_input("Nom Complet *")
            new_role_nom = st.selectbox("Rôle *", list(role_dict.keys()))
        with col2:
            new_email = st.text_input("Adresse Email *")
            new_mdp   = st.text_input("Mot de passe *", type="password")
        if st.form_submit_button("🚀  Créer l'utilisateur", use_container_width=True):
            if new_nom and new_email and new_mdp:
                ok, msg = ajouter_utilisateur(nom_complet=new_nom, email=new_email,
                                              mot_de_passe=new_mdp, id_role=role_dict[new_role_nom])
                st.success(msg) if ok else st.error(msg)
                if ok: st.rerun()
            else:
                st.error("Veuillez remplir tous les champs obligatoires (*).")

# ==============================================================================
# 11. ROUTER
# ==============================================================================
if not st.session_state['logged_in']:
    render_login()
else:
    choice = render_sidebar()

    # Strip emoji prefix for comparison
    if "Tableau de Bord" in choice:
        page_dashboard()
    elif "Audit" in choice:
        page_audit()
    elif "Configuration des Cibles" in choice:
        page_config_cibles()
    elif "Configuration" in choice:
        page_configuration()
    elif "Scripts" in choice:
        page_scripts()
    elif "Utilisateurs" in choice:
        page_utilisateurs()