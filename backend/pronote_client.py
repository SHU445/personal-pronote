"""
Client Pronote complet pour le dashboard Personal Pronote
Supporte toutes les donnees: notes, moyennes, devoirs, EDT, menus, messages, absences
"""

import json
import sys
import io
import uuid as uuid_module
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, asdict

import pronotepy
from pronotepy import *

# Forcer l'encodage UTF-8 pour stdout et stderr sur Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Fichier de credentials pour la connexion persistante (fallback si pas de Neon)
CREDENTIALS_FILE = Path(__file__).parent / "credentials.json"
DATA_FILE = Path(__file__).parent / "data.json"

# Neon: utiliser db.py si DATABASE_URL est défini
def _use_db():
    try:
        from db import use_database
        return use_database()
    except Exception:
        return False


def log(message: str, data=None):
    """Log avec timestamp vers stderr pour ne pas polluer stdout (JSON)"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    if data is not None:
        print(f"[{timestamp}] [Python] {message}: {data}", file=sys.stderr)
    else:
        print(f"[{timestamp}] [Python] {message}", file=sys.stderr)


@dataclass
class Devoir:
    """Represente un devoir"""
    matiere: str
    description: str
    date_rendu: str
    fait: bool
    fichiers: list[str]
    
    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Note:
    """Represente une note"""
    matiere: str
    note: str
    bareme: str
    coefficient: float
    moyenne_classe: str
    note_min: str
    note_max: str
    commentaire: str
    date: str
    
    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Moyenne:
    """Represente une moyenne par matiere"""
    matiere: str
    moyenne_eleve: str
    moyenne_classe: str
    moyenne_min: str
    moyenne_max: str
    
    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Lesson:
    """Represente un cours dans l'emploi du temps"""
    id: str
    matiere: str
    professeur: str
    salle: str
    debut: str
    fin: str
    annule: bool
    modifie: bool
    contenu: str
    
    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Menu:
    """Represente un menu de cantine"""
    date: str
    repas: str
    entrees: list[str]
    plats: list[str]
    accompagnements: list[str]
    desserts: list[str]
    
    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Discussion:
    """Represente une discussion/message"""
    id: str
    sujet: str
    auteur: str
    date: str
    lu: bool
    messages_count: int
    dernier_message: str
    
    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Absence:
    """Represente une absence"""
    date_debut: str
    date_fin: str
    justifie: bool
    motif: str
    heures: float
    
    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Retard:
    """Represente un retard"""
    date: str
    justifie: bool
    motif: str
    minutes: int
    
    def to_dict(self) -> dict:
        return asdict(self)


class PronoteClient:
    """Client complet pour interagir avec Pronote"""
    
    def __init__(self):
        self.client: Optional[pronotepy.Client] = None
        self.connected = False
    
    def check_credentials_exist(self) -> dict:
        """
        Verifie rapidement si les credentials existent (sans connexion reseau)
        """
        log("=== CHECK CREDENTIALS EXIST ===")
        
        if _use_db():
            try:
                from db import get_credentials
                creds = get_credentials()
                if not creds:
                    log("Aucun credentials en base (Neon)")
                    return {"connected": False, "error": "Aucun token sauvegarde"}
                log("Credentials lus (Neon)", {
                    "url": (creds.get("url") or "")[:50] + "...",
                    "username": creds.get("username"),
                    "has_password": bool(creds.get("password")),
                    "has_uuid": bool(creds.get("uuid"))
                })
                required = ["url", "username", "password", "uuid"]
                for field in required:
                    if not creds.get(field):
                        log(f"Champ manquant: {field}")
                        return {"connected": False, "error": f"Champ manquant: {field}"}
                log("Credentials valides")
                return {"connected": True, "credentials_exist": True}
            except Exception as e:
                log(f"Erreur lecture credentials (Neon): {e}")
                return {"connected": False, "error": str(e)}
        
        if not CREDENTIALS_FILE.exists():
            log("Fichier credentials.json non trouvé")
            return {"connected": False, "error": "Aucun token sauvegarde"}
        
        try:
            with open(CREDENTIALS_FILE, "r", encoding="utf-8") as f:
                creds = json.load(f)
            
            log("Credentials lus", {
                "url": creds.get("url", "")[:50] + "...",
                "username": creds.get("username"),
                "has_password": bool(creds.get("password")),
                "password_length": len(creds.get("password", "")),
                "has_uuid": bool(creds.get("uuid"))
            })
            
            required = ["url", "username", "password", "uuid"]
            for field in required:
                if not creds.get(field):
                    log(f"Champ manquant: {field}")
                    return {"connected": False, "error": f"Champ manquant: {field}"}
            
            log("Credentials valides")
            return {"connected": True, "credentials_exist": True}
        except Exception as e:
            log(f"Erreur lecture credentials: {e}")
            return {"connected": False, "error": str(e)}
    
    def connect_with_token(self) -> dict:
        """
        Se connecte avec le token sauvegarde
        Retourne un dict avec le statut et les infos eleve
        """
        log("=== CONNECT WITH TOKEN ===")
        
        creds = None
        if _use_db():
            try:
                from db import get_credentials
                creds = get_credentials()
            except Exception as e:
                log(f"Erreur lecture credentials Neon: {e}")
                return {"connected": False, "error": str(e)}
        elif CREDENTIALS_FILE.exists():
            try:
                with open(CREDENTIALS_FILE, "r", encoding="utf-8") as f:
                    creds = json.load(f)
            except Exception as e:
                log(f"Erreur lecture credentials: {e}")
                return {"connected": False, "error": str(e)}
        
        if not creds:
            log("Aucun credentials (fichier ou Neon)")
            return {"connected": False, "error": "Aucun token sauvegarde"}
        
        try:
            original_url = creds["url"]
            log("Credentials chargés", {
                "url_original": original_url[:100] + "..." if len(original_url) > 100 else original_url,
                "username": creds["username"],
                "password_length": len(creds.get("password", "")),
                "uuid": creds["uuid"]
            })
            
            # Utiliser l'URL telle quelle - elle contient les paramètres nécessaires (fd, bydlg, etc.)
            # Si l'URL a déjà des paramètres, ajouter login=true avec &
            # Sinon, ajouter avec ?
            if "?" in original_url:
                if "login=true" not in original_url:
                    url = original_url + "&login=true"
                else:
                    url = original_url
            else:
                url = original_url + "?login=true"
            
            log(f"URL pour token_login: {url}")
            log("Tentative de connexion avec token_login...")
            
            self.client = pronotepy.Client.token_login(
                url,
                creds["username"],
                creds["password"],
                creds["uuid"]
            )
            
            log(f"Connexion établie, logged_in = {self.client.logged_in}")
            
            if self.client.logged_in:
                self.connected = True
                
                log("Mise à jour des credentials avec nouveau token")
                log(f"Nouveau username: {self.client.username}")
                log(f"Nouveau password length: {len(self.client.password)}")
                
                # Sauvegarder les nouveaux credentials pour la prochaine fois
                if _use_db():
                    from db import set_credentials
                    set_credentials(
                        creds["url"],
                        self.client.username,
                        self.client.password,
                        creds["uuid"]
                    )
                    log("Credentials sauvegardés (Neon)")
                else:
                    new_creds = {
                        "url": creds["url"],
                        "username": self.client.username,
                        "password": self.client.password,
                        "uuid": creds["uuid"]
                    }
                    with open(CREDENTIALS_FILE, "w", encoding="utf-8") as f:
                        json.dump(new_creds, f, indent=2)
                    log("Credentials sauvegardés")
                eleve_info = self.get_info_eleve()
                log("Info élève récupérées", eleve_info)
                
                return {
                    "connected": True,
                    "eleve": eleve_info
                }
            
            log("Connexion échouée - logged_in = False")
            return {"connected": False, "error": "Token invalide ou expire", "token_expired": True}
            
        except Exception as e:
            error_msg = str(e)
            log(f"Exception lors de la connexion: {error_msg}")
            import traceback
            log(f"Traceback: {traceback.format_exc()}")
            
            # Detecter les erreurs de token expire
            if "Page html is different" in error_msg or "token" in error_msg.lower():
                log("Erreur détectée comme token expiré")
                return {"connected": False, "error": "Token expire - veuillez vous reconnecter", "token_expired": True}
            return {"connected": False, "error": error_msg}
    
    def connect_with_qrcode(self, qr_json: str, pin: str) -> dict:
        """
        Se connecte avec les donnees du QR code
        qr_json: contenu JSON du QR code (string)
        pin: code PIN 4 chiffres
        Retourne un dict avec le statut
        """
        log("=== CONNECT WITH QRCODE ===")
        log(f"QR JSON reçu (longueur: {len(qr_json)})")
        log(f"PIN reçu (longueur: {len(pin)})")
        
        try:
            # Nettoyer et parser le JSON
            qr_json = qr_json.strip()
            qr_json = qr_json.replace("%7D", "}").replace("%7B", "{")
            
            log("Parsing du QR JSON...")
            qr_data = json.loads(qr_json)
            
            log("QR Data parsé", {
                "jeton": qr_data.get("jeton", "")[:20] + "..." if qr_data.get("jeton") else None,
                "login": qr_data.get("login"),
                "url": qr_data.get("url"),
                "keys": list(qr_data.keys())
            })
            
            # Generer un UUID unique pour cet appareil
            device_uuid = str(uuid_module.uuid4())
            log(f"UUID généré: {device_uuid}")
            
            log("Tentative de connexion avec qrcode_login...")
            self.client = pronotepy.Client.qrcode_login(qr_data, pin, device_uuid)
            
            log(f"Connexion établie, logged_in = {self.client.logged_in}")
            
            if self.client.logged_in:
                self.connected = True
                
                log(f"Username du client: {self.client.username}")
                log(f"Password du client (longueur): {len(self.client.password)}")
                
                # Recuperer l'URL correcte depuis le client (pas celle du QR code)
                # pronotepy stocke l'URL dans client.pronote_url
                pronote_url = getattr(self.client, 'pronote_url', None)
                
                log(f"pronote_url from client: {pronote_url}")
                log(f"qr_data url: {qr_data.get('url', '')}")
                
                # IMPORTANT: Utiliser l'URL complète du client (avec paramètres fd et bydlg)
                # Ces paramètres sont NECESSAIRES pour token_login
                # Ne PAS nettoyer l'URL !
                
                if pronote_url:
                    # Utiliser l'URL du client telle quelle
                    final_url = pronote_url
                    log(f"Utilisation de l'URL du client (complète)")
                else:
                    # Fallback sur l'URL du QR code
                    final_url = qr_data.get("url", "")
                    log(f"Fallback sur l'URL du QR code")
                
                log(f"URL finale à sauvegarder: {final_url}")
                
                # Sauvegarder les credentials pour les prochaines connexions
                creds = {
                    "url": final_url,
                    "username": self.client.username,
                    "password": self.client.password,
                    "uuid": device_uuid
                }
                
                log("Sauvegarde des credentials...")
                if _use_db():
                    from db import set_credentials
                    set_credentials(
                        final_url, self.client.username, self.client.password, device_uuid
                    )
                    log("Credentials sauvegardés avec succès (Neon)")
                else:
                    with open(CREDENTIALS_FILE, "w", encoding="utf-8") as f:
                        json.dump(creds, f, indent=2)
                    log("Credentials sauvegardés avec succès")
                    if CREDENTIALS_FILE.exists():
                        with open(CREDENTIALS_FILE, "r", encoding="utf-8") as f:
                            saved_creds = json.load(f)
                        log("Vérification credentials sauvegardés", {
                            "url": saved_creds.get("url", "")[:50] + "...",
                            "username": saved_creds.get("username"),
                            "password_length": len(saved_creds.get("password", ""))
                        })
                
                # Recuperer les donnees immediatement apres la connexion
                # car token_login peut echouer plus tard
                try:
                    log("Récupération des données immédiate...")
                    data = self.get_all_data()
                    log("Données récupérées et sauvegardées avec succès")
                except Exception as e:
                    log(f"Erreur récupération données: {e}")
                
                eleve_info = self.get_info_eleve()
                log("Info élève", eleve_info)
                
                return {
                    "connected": True,
                    "eleve": eleve_info
                }
            
            log("Connexion échouée - logged_in = False")
            return {"connected": False, "error": "Connexion echouee - verifiez le PIN"}
            
        except json.JSONDecodeError as e:
            log(f"Erreur parsing JSON: {e}")
            return {"connected": False, "error": "Format JSON du QR code invalide"}
        except Exception as e:
            log(f"Exception: {e}")
            import traceback
            log(f"Traceback: {traceback.format_exc()}")
            return {"connected": False, "error": str(e)}
    
    def logout(self) -> dict:
        """Deconnexion et suppression des credentials"""
        try:
            if _use_db():
                from db import delete_credentials
                delete_credentials()
            elif CREDENTIALS_FILE.exists():
                CREDENTIALS_FILE.unlink()
            self.client = None
            self.connected = False
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_info_eleve(self) -> dict:
        """Recupere les informations de l'eleve"""
        if not self._check_connection():
            return {}
        
        try:
            info = self.client.info
            return {
                "nom": info.name,
                "etablissement": info.establishment,
                "classe": info.class_name,
                "periode_actuelle": self.client.current_period.name if self.client.current_period else ""
            }
        except Exception as e:
            return {"error": str(e)}
    
    def get_devoirs(self, jours_avant: int = 7, jours_apres: int = 30) -> list[Devoir]:
        """Recupere les devoirs sur une periode donnee"""
        if not self._check_connection():
            return []
        
        devoirs = []
        
        try:
            # Utiliser .date() pour éviter les erreurs de comparaison datetime vs date
            date_debut = (datetime.now() - timedelta(days=jours_avant)).date()
            date_fin = (datetime.now() + timedelta(days=jours_apres)).date()
            
            homework = self.client.homework(date_from=date_debut, date_to=date_fin)
            
            for hw in homework:
                devoir = Devoir(
                    matiere=hw.subject.name if hw.subject else "Inconnu",
                    description=hw.description or "",
                    date_rendu=hw.date.strftime("%Y-%m-%d") if hw.date else "",
                    fait=hw.done,
                    fichiers=[f.name for f in hw.files] if hw.files else []
                )
                devoirs.append(devoir)
            
        except Exception as e:
            print(f"[ERREUR] Devoirs: {e}", file=sys.stderr)
        
        return devoirs
    
    def get_notes(self) -> list[Note]:
        """Recupere toutes les notes de la periode actuelle"""
        if not self._check_connection():
            return []
        
        notes = []
        
        try:
            for period in self.client.periods:
                if period.name == self.client.current_period.name:
                    for grade in period.grades:
                        note = Note(
                            matiere=grade.subject.name if grade.subject else "Inconnu",
                            note=grade.grade or "",
                            bareme=str(grade.out_of) if grade.out_of else "20",
                            coefficient=float(grade.coefficient) if grade.coefficient else 1.0,
                            moyenne_classe=str(grade.average) if grade.average else "",
                            note_min=str(grade.min) if grade.min else "",
                            note_max=str(grade.max) if grade.max else "",
                            commentaire=grade.comment or "",
                            date=grade.date.strftime("%Y-%m-%d") if grade.date else ""
                        )
                        notes.append(note)
            
        except Exception as e:
            print(f"[ERREUR] Notes: {e}", file=sys.stderr)
        
        return notes
    
    def get_moyennes(self) -> list[Moyenne]:
        """Recupere les moyennes par matiere"""
        if not self._check_connection():
            return []
        
        moyennes = []
        
        try:
            for period in self.client.periods:
                if period.name == self.client.current_period.name:
                    for avg in period.averages:
                        moyenne = Moyenne(
                            matiere=avg.subject.name if avg.subject else "Inconnu",
                            moyenne_eleve=str(avg.student) if avg.student else "",
                            moyenne_classe=str(avg.class_average) if avg.class_average else "",
                            moyenne_min=str(avg.min) if avg.min else "",
                            moyenne_max=str(avg.max) if avg.max else ""
                        )
                        moyennes.append(moyenne)
            
        except Exception as e:
            print(f"[ERREUR] Moyennes: {e}", file=sys.stderr)
        
        return moyennes
    
    def get_lessons(self, jours_avant: int = 0, jours_apres: int = 7) -> list[Lesson]:
        """Recupere l'emploi du temps sur une periode donnee"""
        if not self._check_connection():
            return []
        
        lessons = []
        
        try:
            # Utiliser .date() pour éviter les erreurs de comparaison
            date_debut = (datetime.now() - timedelta(days=jours_avant)).date()
            date_fin = (datetime.now() + timedelta(days=jours_apres)).date()
            
            cours = self.client.lessons(date_from=date_debut, date_to=date_fin)
            
            for c in cours:
                # Gérer le contenu qui peut être un objet LessonContent
                contenu = ""
                if hasattr(c, 'content') and c.content:
                    if hasattr(c.content, 'description'):
                        contenu = c.content.description or ""
                    elif isinstance(c.content, str):
                        contenu = c.content
                    else:
                        contenu = str(c.content) if c.content else ""
                
                lesson = Lesson(
                    id=str(c.id) if hasattr(c, 'id') else "",
                    matiere=c.subject.name if c.subject else "Inconnu",
                    professeur=c.teacher_name if hasattr(c, 'teacher_name') else "",
                    salle=c.classroom if hasattr(c, 'classroom') else "",
                    debut=c.start.isoformat() if c.start else "",
                    fin=c.end.isoformat() if c.end else "",
                    annule=c.canceled if hasattr(c, 'canceled') else False,
                    modifie=c.status if hasattr(c, 'status') else False,
                    contenu=contenu
                )
                lessons.append(lesson)
            
        except Exception as e:
            print(f"[ERREUR] Lessons: {e}", file=sys.stderr)
        
        return lessons
    
    def get_menus(self, jours_avant: int = 0, jours_apres: int = 14) -> list[Menu]:
        """Recupere les menus de la cantine"""
        if not self._check_connection():
            return []
        
        menus = []
        
        try:
            # Utiliser .date() pour éviter les erreurs de comparaison datetime vs date
            date_debut = (datetime.now() - timedelta(days=jours_avant)).date()
            date_fin = (datetime.now() + timedelta(days=jours_apres)).date()
            
            menus_data = self.client.menus(date_from=date_debut, date_to=date_fin)
            
            for m in menus_data:
                menu = Menu(
                    date=m.date.strftime("%Y-%m-%d") if m.date else "",
                    repas=m.name if hasattr(m, 'name') else "Dejeuner",
                    entrees=[e.name for e in m.first_meal] if hasattr(m, 'first_meal') and m.first_meal else [],
                    plats=[p.name for p in m.main_meal] if hasattr(m, 'main_meal') and m.main_meal else [],
                    accompagnements=[a.name for a in m.side_meal] if hasattr(m, 'side_meal') and m.side_meal else [],
                    desserts=[d.name for d in m.dessert] if hasattr(m, 'dessert') and m.dessert else []
                )
                menus.append(menu)
            
        except Exception as e:
            print(f"[ERREUR] Menus: {e}", file=sys.stderr)
        
        return menus
    
    def get_discussions(self, only_unread: bool = False) -> list[Discussion]:
        """Recupere les discussions/messages"""
        if not self._check_connection():
            return []
        
        discussions = []
        
        try:
            disc_list = self.client.discussions(only_unread=only_unread)
            
            for d in disc_list:
                discussion = Discussion(
                    id=str(d.id) if hasattr(d, 'id') else "",
                    sujet=d.subject if hasattr(d, 'subject') else "",
                    auteur=d.creator if hasattr(d, 'creator') else "",
                    date=d.date.isoformat() if hasattr(d, 'date') and d.date else "",
                    lu=not d.unread if hasattr(d, 'unread') else True,
                    messages_count=len(d.messages) if hasattr(d, 'messages') else 0,
                    dernier_message=""
                )
                discussions.append(discussion)
            
        except Exception as e:
            print(f"[ERREUR] Discussions: {e}", file=sys.stderr)
        
        return discussions
    
    def get_absences(self) -> tuple[list[Absence], list[Retard]]:
        """Recupere les absences et retards"""
        if not self._check_connection():
            return [], []
        
        absences = []
        retards = []
        
        try:
            for period in self.client.periods:
                if period.name == self.client.current_period.name:
                    # Absences
                    if hasattr(period, 'absences'):
                        for a in period.absences:
                            absence = Absence(
                                date_debut=a.from_date.isoformat() if hasattr(a, 'from_date') and a.from_date else "",
                                date_fin=a.to_date.isoformat() if hasattr(a, 'to_date') and a.to_date else "",
                                justifie=a.justified if hasattr(a, 'justified') else False,
                                motif=a.reasons[0] if hasattr(a, 'reasons') and a.reasons else "",
                                heures=self._parse_hours(a.hours) if hasattr(a, 'hours') else 0.0
                            )
                            absences.append(absence)
                    
                    # Retards
                    if hasattr(period, 'delays'):
                        for r in period.delays:
                            retard = Retard(
                                date=r.date.isoformat() if hasattr(r, 'date') and r.date else "",
                                justifie=r.justified if hasattr(r, 'justified') else False,
                                motif=r.reasons[0] if hasattr(r, 'reasons') and r.reasons else "",
                                minutes=int(r.minutes) if hasattr(r, 'minutes') else 0
                            )
                            retards.append(retard)
            
        except Exception as e:
            print(f"[ERREUR] Absences: {e}", file=sys.stderr)
        
        return absences, retards
    
    def get_all_data(self) -> dict:
        """Recupere toutes les donnees et les retourne en JSON"""
        if not self._check_connection():
            return {"error": "Non connecte"}
        
        absences, retards = self.get_absences()
        
        data = {
            "export_date": datetime.now().isoformat(),
            "eleve": self.get_info_eleve(),
            "devoirs": [d.to_dict() for d in self.get_devoirs()],
            "notes": [n.to_dict() for n in self.get_notes()],
            "moyennes": [m.to_dict() for m in self.get_moyennes()],
            "lessons": [l.to_dict() for l in self.get_lessons()],
            "menus": [m.to_dict() for m in self.get_menus()],
            "discussions": [d.to_dict() for d in self.get_discussions()],
            "absences": [a.to_dict() for a in absences],
            "retards": [r.to_dict() for r in retards]
        }
        
        # Sauvegarder (Neon ou fichier)
        if _use_db():
            from db import set_cache
            set_cache(data)
        else:
            with open(DATA_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        
        return data
    
    def _check_connection(self) -> bool:
        """Verifie que le client est connecte"""
        return self.connected and self.client is not None
    
    def _parse_hours(self, hours_value) -> float:
        """Parse une valeur d'heures qui peut être un nombre ou une chaîne comme '5h00'"""
        if hours_value is None:
            return 0.0
        
        if isinstance(hours_value, (int, float)):
            return float(hours_value)
        
        if isinstance(hours_value, str):
            # Format "5h00" ou "5h30"
            hours_str = hours_value.lower().strip()
            if 'h' in hours_str:
                parts = hours_str.split('h')
                try:
                    hours = float(parts[0]) if parts[0] else 0
                    minutes = float(parts[1]) if len(parts) > 1 and parts[1] else 0
                    return hours + minutes / 60
                except ValueError:
                    return 0.0
            else:
                try:
                    return float(hours_str)
                except ValueError:
                    return 0.0
        
        return 0.0


# === CLI Interface ===
def main():
    """Interface CLI pour le script"""
    log("=== PRONOTE CLIENT CLI ===")
    log(f"Arguments: {sys.argv}")
    log(f"Dossier de travail: {Path.cwd()}")
    log(f"Fichier credentials: {CREDENTIALS_FILE}")
    log(f"Fichier data: {DATA_FILE}")
    
    if len(sys.argv) < 2:
        print("Usage: python pronote_client.py <command> [args]")
        print("Commands:")
        print("  status          - Verifier le statut de connexion")
        print("  connect_qr      - Connexion via QR code (args: qr_json pin)")
        print("  logout          - Deconnexion")
        print("  data            - Recuperer toutes les donnees")
        sys.exit(1)
    
    command = sys.argv[1]
    log(f"Commande: {command}")
    
    client = PronoteClient()
    
    if command == "status":
        log("Exécution: status (vérification rapide)")
        # Verification rapide (sans connexion reseau)
        result = client.check_credentials_exist()
        log("Résultat status", result)
        print(json.dumps(result, ensure_ascii=False))
    
    elif command == "status_full":
        log("Exécution: status_full (avec connexion)")
        # Verification complete avec connexion a Pronote
        result = client.connect_with_token()
        log("Résultat status_full", result)
        print(json.dumps(result, ensure_ascii=False))
    
    elif command == "connect_qr":
        log("Exécution: connect_qr")
        if len(sys.argv) < 4:
            print(json.dumps({"connected": False, "error": "Arguments manquants: qr_json pin"}))
            sys.exit(1)
        qr_json = sys.argv[2]
        pin = sys.argv[3]
        result = client.connect_with_qrcode(qr_json, pin)
        log("Résultat connect_qr", {"connected": result.get("connected")})
        print(json.dumps(result, ensure_ascii=False))
    
    elif command == "connect_qr_file":
        log("Exécution: connect_qr_file")
        # Lire le QR JSON et PIN depuis un fichier temporaire (pour eviter les problemes d'echappement)
        if len(sys.argv) < 3:
            print(json.dumps({"connected": False, "error": "Argument manquant: fichier temporaire"}))
            sys.exit(1)
        temp_file = sys.argv[2]
        log(f"Lecture fichier temporaire: {temp_file}")
        try:
            with open(temp_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            qr_json = data.get("qr_json", "")
            pin = data.get("pin", "")
            log(f"Données lues: qr_json={len(qr_json)} chars, pin={len(pin)} chars")
            result = client.connect_with_qrcode(qr_json, pin)
            log("Résultat connect_qr_file", {"connected": result.get("connected")})
            print(json.dumps(result, ensure_ascii=False))
        except Exception as e:
            log(f"Erreur lecture fichier: {e}")
            import traceback
            log(f"Traceback: {traceback.format_exc()}")
            print(json.dumps({"connected": False, "error": f"Erreur lecture fichier: {e}"}))
            sys.exit(1)
    
    elif command == "logout":
        log("Exécution: logout")
        result = client.logout()
        log("Résultat logout", result)
        print(json.dumps(result, ensure_ascii=False))
    
    elif command == "data":
        log("Exécution: data")
        # D'abord se connecter
        log("Tentative de connexion avec token...")
        connect_result = client.connect_with_token()
        log("Résultat connexion", connect_result)
        
        if not connect_result.get("connected"):
            log("Échec de connexion - retour erreur")
            print(json.dumps({"error": "Non connecte", "details": connect_result}))
            sys.exit(1)
        
        log("Connexion réussie, récupération des données...")
        data = client.get_all_data()
        log("Données récupérées", {
            "export_date": data.get("export_date"),
            "eleve": data.get("eleve", {}).get("nom"),
            "notes_count": len(data.get("notes", [])),
            "devoirs_count": len(data.get("devoirs", []))
        })
        print(json.dumps(data, ensure_ascii=False))
    
    else:
        log(f"Commande inconnue: {command}")
        print(json.dumps({"error": f"Commande inconnue: {command}"}))
        sys.exit(1)
    
    log("=== FIN PRONOTE CLIENT CLI ===")


if __name__ == "__main__":
    main()
