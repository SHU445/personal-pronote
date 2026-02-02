/**
 * Client Pronote via Pawnote (Node.js) - remplace le backend Python.
 * Utilisé par les API routes quand useNeon() est true (Solution 1).
 */

import {
  createSessionHandle,
  loginQrCode,
  loginToken,
  AccountKind,
  TabLocation,
  assignmentsFromIntervals,
  gradesOverview,
  timetableFromIntervals,
  parseTimetable,
  menus as pawnoteMenus,
  discussions as pawnoteDiscussions,
  notebook,
  type SessionHandle,
  type RefreshInformation,
} from 'pawnote'
import type { PronoteData, Eleve, Devoir, Note, Moyenne, Lesson, Menu, Discussion, Absence, Retard } from '@/types/pronote'
import type { Semestre } from './db'
import { getPronoteCredentials, setPronoteCredentials, deletePronoteCredentials, setPronoteCache } from './db'
import { htmlToPlainText } from './utils'

const GradeKind = { Error: -1, Grade: 0, Absent: 1, Exempted: 2, NotGraded: 3, Unfit: 4, Unreturned: 5, AbsentZero: 6, UnreturnedZero: 7, Congratulations: 8 } as const

function formatGradeValue(value: { kind: number; points: number }): string {
  if (!value) return ''
  if (value.kind === GradeKind.Grade) return String(value.points)
  if (value.kind === GradeKind.Absent || value.kind === GradeKind.AbsentZero) return 'Absent'
  if (value.kind === GradeKind.Exempted) return 'Dispensé'
  if (value.kind === GradeKind.NotGraded) return 'NonNoté'
  if (value.kind === GradeKind.Unreturned || value.kind === GradeKind.UnreturnedZero) return 'Non rendu'
  if (value.kind === GradeKind.Congratulations) return 'Félicitations'
  return String(value.points)
}

function dateToISO(d: Date): string {
  return d instanceof Date && !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : ''
}

/** Vérifie si des credentials existent en base (sans connexion réseau). */
export async function checkCredentialsExist(): Promise<{ connected: boolean; error?: string }> {
  const creds = await getPronoteCredentials()
  if (!creds) return { connected: false, error: 'Aucun token sauvegardé' }
  if (!creds.url || !creds.username || !creds.password || !creds.uuid) return { connected: false, error: 'Champ manquant' }
  return { connected: true }
}

/** Connexion avec le token sauvegardé. Retourne { connected, eleve? } ou { connected: false, error, tokenExpired? }. */
export async function connectWithToken(): Promise<{ connected: boolean; eleve?: Eleve; error?: string; tokenExpired?: boolean }> {
  const creds = await getPronoteCredentials()
  if (!creds) return { connected: false, error: 'Aucun token sauvegardé' }
  const session = createSessionHandle()
  try {
    const refresh = await loginToken(session, {
      url: creds.url,
      kind: AccountKind.STUDENT,
      username: creds.username,
      token: creds.password,
      deviceUUID: creds.uuid,
    })
    await saveCredentialsFromRefresh(creds.url, refresh, creds.uuid)
    const eleve = getEleveFromSession(session)
    return { connected: true, eleve }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    const tokenExpired = /token|expire|credentials|page html/i.test(msg)
    return { connected: false, error: tokenExpired ? 'Token expiré - veuillez vous reconnecter' : msg, tokenExpired }
  }
}

/** Connexion via QR code. Sauvegarde les credentials et retourne { connected, eleve? } ou { connected: false, error }. */
export async function connectWithQRCode(qrJson: string, pin: string): Promise<{ connected: boolean; eleve?: Eleve; error?: string }> {
  let qr: unknown
  try {
    const cleaned = qrJson.trim().replace(/%7D/g, '}').replace(/%7B/g, '{')
    qr = JSON.parse(cleaned)
  } catch {
    return { connected: false, error: 'Format JSON du QR code invalide' }
  }
  const deviceUUID = crypto.randomUUID?.() ?? `pp-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const session = createSessionHandle()
  try {
    const refresh = await loginQrCode(session, { deviceUUID, pin, qr })
    await saveCredentialsFromRefresh(refresh.url, refresh, deviceUUID)
    const eleve = getEleveFromSession(session)
    return { connected: true, eleve }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { connected: false, error: msg }
  }
}

async function saveCredentialsFromRefresh(url: string, refresh: RefreshInformation, uuid: string): Promise<void> {
  await setPronoteCredentials(url, refresh.username, refresh.token, uuid)
}

function getEleveFromSession(session: SessionHandle): Eleve {
  const r = session.userResource
  const tabGradebook = r.tabs.get(TabLocation.Gradebook)
  const periodName = tabGradebook?.defaultPeriod?.name ?? ''
  return {
    nom: r.name ?? '',
    etablissement: r.establishmentName ?? '',
    classe: r.className ?? '',
    periode_actuelle: periodName,
  }
}

/** Déconnexion : suppression des credentials en base. */
export async function logoutPronote(): Promise<{ success: boolean; error?: string }> {
  try {
    await deletePronoteCredentials()
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Récupère toutes les données Pronote et les enregistre en cache (S1 et S2). Retourne PronoteData du semestre 1 ou { error }. */
export async function fetchAllPronoteData(): Promise<PronoteData | { error: string; details?: unknown }> {
  const creds = await getPronoteCredentials()
  if (!creds) return { error: 'Non connecté - aucun token sauvegardé' }
  const session = createSessionHandle()
  try {
    await loginToken(session, {
      url: creds.url,
      kind: AccountKind.STUDENT,
      username: creds.username,
      token: creds.password,
      deviceUUID: creds.uuid,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { error: msg, details: { token_expired: /token|expire/i.test(msg) } }
  }

  const eleve = getEleveFromSession(session)
  const tabGradebook = session.userResource.tabs.get(TabLocation.Gradebook)
  const tabNotebook = session.userResource.tabs.get(TabLocation.Notebook)
  const gradebookPeriods = tabGradebook?.periods ?? []
  const notebookPeriods = tabNotebook?.periods ?? []

  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - 7)
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + 30)

  let devoirs: Devoir[] = []
  let lessons: Lesson[] = []
  let menusList: Menu[] = []
  let discussionsList: Discussion[] = []

  try {
    const [assignmentsRes, timetableRes, menusRes, discussionsRes] = await Promise.all([
      assignmentsFromIntervals(session, startDate, endDate).catch(() => []),
      timetableFromIntervals(session, startDate, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)).catch(() => null),
      pawnoteMenus(session, now).catch(() => null),
      pawnoteDiscussions(session).catch(() => null),
    ])

    if (Array.isArray(assignmentsRes)) {
      devoirs = assignmentsRes.map((a) => ({
        matiere: a.subject?.name ?? 'Inconnu',
        description: htmlToPlainText(a.description ?? ''),
        date_rendu: dateToISO(a.deadline),
        fait: a.done,
        fichiers: (a.attachments ?? []).map((f) => f.name ?? ''),
      }))
    }

    if (timetableRes) {
      parseTimetable(session, timetableRes, { withCanceledClasses: true, withPlannedClasses: true })
      const classes = (timetableRes as { classes?: Array<{ is?: string; subject?: { name?: string }; startDate?: Date; endDate?: Date; teacherNames?: string[]; classrooms?: string[]; canceled?: boolean; status?: unknown; notes?: string }> }).classes ?? []
      lessons = classes
        .filter((c) => c.is === 'lesson')
        .map((c) => ({
          id: '',
          matiere: c.subject?.name ?? 'Inconnu',
          professeur: Array.isArray(c.teacherNames) ? c.teacherNames.join(', ') : '',
          salle: Array.isArray(c.classrooms) ? c.classrooms.join(', ') : '',
          debut: c.startDate ? new Date(c.startDate).toISOString() : '',
          fin: c.endDate ? new Date(c.endDate).toISOString() : '',
          annule: Boolean(c.canceled),
          modifie: Boolean(c.status),
          contenu: c.notes ?? '',
        }))
    }

    if (menusRes?.days) {
      for (const day of menusRes.days) {
        const d = day.date ? dateToISO(day.date) : ''
        if (day.lunch) {
          menusList.push({
            date: d,
            repas: 'Déjeuner',
            entrees: (day.lunch.entry ?? []).map((f) => (f as { name?: string }).name ?? ''),
            plats: (day.lunch.main ?? []).map((f) => (f as { name?: string }).name ?? ''),
            accompagnements: (day.lunch.side ?? []).map((f) => (f as { name?: string }).name ?? ''),
            desserts: (day.lunch.dessert ?? []).map((f) => (f as { name?: string }).name ?? ''),
          })
        }
        if (day.dinner) {
          menusList.push({
            date: d,
            repas: 'Dîner',
            entrees: (day.dinner.entry ?? []).map((f) => (f as { name?: string }).name ?? ''),
            plats: (day.dinner.main ?? []).map((f) => (f as { name?: string }).name ?? ''),
            accompagnements: (day.dinner.side ?? []).map((f) => (f as { name?: string }).name ?? ''),
            desserts: (day.dinner.dessert ?? []).map((f) => (f as { name?: string }).name ?? ''),
          })
        }
      }
    }

    if (discussionsRes?.items) {
      discussionsList = discussionsRes.items.map((d) => ({
        id: d.participantsMessageID ?? '',
        sujet: d.subject ?? '',
        auteur: d.creator ?? '',
        date: d.date ? new Date(d.date).toISOString() : '',
        lu: (d.numberOfMessagesUnread ?? 0) === 0,
        messages_count: d.numberOfMessages ?? 0,
        dernier_message: '',
      }))
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { error: msg, details: { token_expired: /token|expire/i.test(msg) } }
  }

  const shared = {
    export_date: new Date().toISOString(),
    eleve,
    devoirs,
    lessons,
    menus: menusList,
    discussions: discussionsList,
  }

  let lastData: PronoteData | null = null
  for (let i = 0; i <= 1; i++) {
    const semestre = (i + 1) as Semestre
    const period = gradebookPeriods[i] ?? null
    const notebookPeriod = notebookPeriods[i] ?? period ?? notebookPeriods[0] ?? tabNotebook?.defaultPeriod ?? period
    if (!period) continue

    let notes: Note[] = []
    let moyennes: Moyenne[] = []
    let absences: Absence[] = []
    let retards: Retard[] = []

    try {
      const [gradesRes, notebookRes] = await Promise.all([
        gradesOverview(session, period).catch(() => null),
        notebookPeriod ? notebook(session, notebookPeriod).catch(() => null) : Promise.resolve(null),
      ])

      if (gradesRes) {
        notes = (gradesRes.grades ?? []).map((g) => ({
          matiere: g.subject?.name ?? 'Inconnu',
          note: formatGradeValue(g.value),
          bareme: formatGradeValue(g.outOf) || '20',
          coefficient: g.coefficient ?? 1,
          moyenne_classe: g.average != null ? formatGradeValue(g.average) : '',
          note_min: g.min != null ? formatGradeValue(g.min) : '',
          note_max: g.max != null ? formatGradeValue(g.max) : '',
          commentaire: '',
          date: dateToISO(g.date),
        }))
        moyennes = (gradesRes.subjectsAverages ?? []).map((s) => ({
          matiere: s.subject?.name ?? 'Inconnu',
          moyenne_eleve: s.student != null ? formatGradeValue(s.student) : '',
          moyenne_classe: s.class_average != null ? formatGradeValue(s.class_average) : '',
          moyenne_min: s.min != null ? formatGradeValue(s.min) : '',
          moyenne_max: s.max != null ? formatGradeValue(s.max) : '',
        }))
      }

      if (notebookRes) {
        absences = (notebookRes.absences ?? []).map((a) => ({
          date_debut: a.startDate ? new Date(a.startDate).toISOString() : '',
          date_fin: a.endDate ? new Date(a.endDate).toISOString() : '',
          justifie: a.justified ?? false,
          motif: a.reason ?? '',
          heures: (a.hoursMissed ?? 0) + (a.minutesMissed ?? 0) / 60,
        }))
        retards = (notebookRes.delays ?? []).map((r) => ({
          date: r.date ? new Date(r.date).toISOString() : '',
          justifie: r.justified ?? false,
          motif: r.reason ?? r.justification ?? '',
          minutes: r.minutes ?? 0,
        }))
      }
    } catch {
      // ignorer erreur pour ce semestre, continuer avec l'autre
    }

    const data: PronoteData = {
      ...shared,
      notes,
      moyennes,
      absences,
      retards,
    }
    lastData = data
    try {
      await setPronoteCache((data as unknown) as Record<string, unknown>, semestre)
    } catch {
      // ignore cache write error
    }
  }

  return lastData ?? {
    ...shared,
    notes: [],
    moyennes: [],
    absences: [],
    retards: [],
  }
}
