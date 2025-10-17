# Dendrite - Implementierungs-Status

## ✅ FERTIG IMPLEMENTIERT

### Backend
- ✅ Benutzer-Authentifizierung (Login/Register)
- ✅ Notizen CRUD (Erstellen, Lesen, Aktualisieren, Löschen)
- ✅ Ordner CRUD
- ✅ Tags CRUD
- ✅ Notizen anheften (Pin)
- ✅ Notizen favorisieren (Star)
- ✅ Suche
- ✅ Datenbank-Schema mit isArchived und isDeleted Feldern

### Frontend - Fertig
- ✅ Login/Register Pages
- ✅ Dashboard Layout
- ✅ Note List
- ✅ Note Editor mit Auto-Save
- ✅ Header mit Suche
- ✅ Folder Store (Zustand)
- ✅ Tag Store (Zustand)
- ✅ Modal-Komponente (wiederverwendbar)
- ✅ CreateFolderModal
- ✅ CreateTagModal
- ✅ Neue Sidebar (Sidebar-new.tsx)

## 🚧 ZU ERLEDIGEN

### 1. Datenbank aktualisieren
```bash
# Führe aus:
update-database.bat
```

Dies fügt die `isArchived` und `isDeleted` Felder zur Datenbank hinzu.

### 2. Backend erweitern

Füge zu `backend/src/controllers/note.controller.ts` hinzu:

```typescript
// Archivieren
export const toggleArchive = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const note = await prisma.note.findFirst({
      where: { id, userId: req.userId },
    });
    if (!note) return res.status(404).json({ error: 'Notiz nicht gefunden' });

    const updatedNote = await prisma.note.update({
      where: { id },
      data: { isArchived: !note.isArchived },
      include: { folder: true, tags: true },
    });
    res.json({ note: updatedNote });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Archivieren' });
  }
};

// Soft Delete
export const toggleDelete = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const note = await prisma.note.findFirst({
      where: { id, userId: req.userId },
    });
    if (!note) return res.status(404).json({ error: 'Notiz nicht gefunden' });

    const updatedNote = await prisma.note.update({
      where: { id },
      data: { isDeleted: !note.isDeleted },
      include: { folder: true, tags: true },
    });
    res.json({ note: updatedNote });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
};
```

Füge zu `backend/src/routes/note.routes.ts` hinzu:
```typescript
router.patch('/:id/archive', toggleArchive);
router.patch('/:id/delete', toggleDelete);
```

### 3. Frontend-Dateien ersetzen

**Ersetze:**
- `frontend/src/components/Sidebar.tsx` mit `frontend/src/components/Sidebar-new.tsx`
- Update `frontend/src/pages/DashboardPage.tsx`
- Update `frontend/src/components/NoteEditor.tsx`

### 4. DashboardPage aktualisieren

Die DashboardPage muss die neue Sidebar-API nutzen:

```typescript
const [currentView, setCurrentView] = useState<'all' | 'favorites' | 'archive' | 'trash' | 'folder' | 'tag'>('all');
const [selectedFolderId, setSelectedFolderId] = useState<string>();
const [selectedTagId, setSelectedTagId] = useState<string>();

const handleViewChange = (view: ViewType, id?: string) => {
  setCurrentView(view);
  if (view === 'folder') setSelectedFolderId(id);
  if (view === 'tag') setSelectedTagId(id);

  // Filter notes based on view
  const filters: any = {};
  switch (view) {
    case 'favorites':
      filters.favorite = true;
      break;
    case 'archive':
      // Backend muss erweitert werden
      break;
    case 'trash':
      // Backend muss erweitert werden
      break;
    case 'folder':
      filters.folderId = id;
      break;
    case 'tag':
      filters.tagId = id;
      break;
  }
  fetchNotes(filters);
};
```

## 📝 VOLLSTÄNDIGE SCHRITTE

1. **Datenbank aktualisieren**: `update-database.bat`
2. **Backend erweitern**: Archive & Delete Endpoints
3. **Frontend Service erweitern**: note.service.ts
4. **Note Store erweitern**: Archive & Delete Funktionen
5. **Sidebar ersetzen**: Sidebar-new.tsx → Sidebar.tsx
6. **Dashboard aktualisieren**: View-Management
7. **Note Editor erweitern**: Ordner/Tag-Dropdowns

## 🎯 FEATURES DIE NOCH FEHLEN

- [ ] Ordner-Dropdown in Note Editor
- [ ] Tags-Dropdown in Note Editor
- [ ] Archive-Filter im Backend
- [ ] Trash-Filter im Backend
- [ ] Permanent Delete aus Papierkorb
- [ ] Notiz-Verschieben zwischen Ordnern
- [ ] Tag-Management in Notiz

## 💡 NÄCHSTE PRIORITÄTEN

1. Database Schema Update ausführen
2. Backend Archive/Delete Endpoints
3. Sidebar austauschen
4. Dashboard View-Management

Möchtest du, dass ich das Schritt für Schritt mit dir zusammen mache?
