const BIN_KEY = "kicklog.bin.items.v1";
const BIN_CHANGED_EVENT = "kicklog:binChanged";

const DIARY_META_KEY = "kicklog.diary.meta.v1";
const DIARIES_KEY = "kicklog.diary.items.v1";
const FOLDERS_KEY = "kicklog.diary.folders.v1";
const ACTIVE_DIARY_KEY = "kicklog.diary.activeId.v1";
const RECENT_DIARIES_KEY = "kicklog.diary.recent.v1";
const ENTRIES_PREFIX = "kicklog.diary.entries.v1:";
const ENTRY_SAVED_PREFIX = "kicklog.diary.entry.saved.v1:";
const ENTRY_DRAFT_PREFIX = "kicklog.diary.entry.draft.v1:";
const CHAPTERS_SAVED_PREFIX = "kicklog.diary.chapters.saved.v1:";
const CHAPTERS_DRAFT_PREFIX = "kicklog.diary.chapters.draft.v1:";
const ACTIVE_CHAPTER_PREFIX = "kicklog.diary.chapter.activeId.v1:";
const SCHEDULE_KEY = "kicklog_schedule_events_v2";

export const BIN_TYPES = {
	diary: "diary",
	folder: "folder",
	session: "session",
	chapter: "chapter",
	note: "note",
};

function canUseStorage() {
	return typeof window !== "undefined" && !!window.localStorage;
}

function safeParseJSON(raw, fallback) {
	try {
		if (!raw) return fallback;
		return JSON.parse(raw);
	} catch {
		return fallback;
	}
}

function asArray(value) {
	return Array.isArray(value) ? value : [];
}

function emit(name) {
	if (!canUseStorage()) return;
	window.dispatchEvent(new Event(name));
}

function makeId(prefix = "bin") {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readArrayKey(key) {
	if (!canUseStorage()) return [];
	return asArray(safeParseJSON(window.localStorage.getItem(key), []));
}

function writeArrayKey(key, next) {
	if (!canUseStorage()) return;
	window.localStorage.setItem(key, JSON.stringify(asArray(next)));
}

function diaryEntriesKey(diaryId) {
	return `${ENTRIES_PREFIX}${String(diaryId ?? "")}`;
}

function diaryEntrySavedKey(diaryId) {
	return `${ENTRY_SAVED_PREFIX}${String(diaryId ?? "")}`;
}

function diaryEntryDraftKey(diaryId) {
	return `${ENTRY_DRAFT_PREFIX}${String(diaryId ?? "")}`;
}

function diaryChaptersSavedKey(diaryId) {
	return `${CHAPTERS_SAVED_PREFIX}${String(diaryId ?? "")}`;
}

function diaryChaptersDraftKey(diaryId) {
	return `${CHAPTERS_DRAFT_PREFIX}${String(diaryId ?? "")}`;
}

function diaryActiveChapterKey(diaryId) {
	return `${ACTIVE_CHAPTER_PREFIX}${String(diaryId ?? "")}`;
}

function loadDiaries() {
	return readArrayKey(DIARIES_KEY).filter((d) => d && typeof d === "object");
}

function saveDiaries(next) {
	writeArrayKey(DIARIES_KEY, next);
	emit("kicklog:diariesChanged");
}

function loadFolders() {
	return readArrayKey(FOLDERS_KEY).filter((f) => f && typeof f === "object");
}

function saveFolders(next) {
	writeArrayKey(FOLDERS_KEY, next);
	emit("kicklog:foldersChanged");
}

function loadScheduleEvents() {
	return readArrayKey(SCHEDULE_KEY).filter((e) => e && typeof e === "object");
}

function saveScheduleEvents(next) {
	writeArrayKey(SCHEDULE_KEY, next);
	emit("kicklog:scheduleChanged");
}

function normalizeBinItem(item) {
	if (!item || typeof item !== "object") return null;
	const id = typeof item.id === "string" && item.id.trim() ? item.id : makeId("bin");
	const type = typeof item.type === "string" ? item.type : "unknown";
	const entityId = typeof item.entityId === "string" ? item.entityId : String(item.entityId ?? "");
	const label = typeof item.label === "string" && item.label.trim() ? item.label : "Deleted item";
	const deletedAt = Number.isFinite(Number(item.deletedAt)) ? Number(item.deletedAt) : Date.now();
	const payload = item.payload && typeof item.payload === "object" ? item.payload : {};
	return {
		id,
		type,
		entityId,
		label,
		deletedAt,
		payload,
	};
}

function saveBinItems(next) {
	if (!canUseStorage()) return;
	window.localStorage.setItem(BIN_KEY, JSON.stringify(asArray(next)));
	emit(BIN_CHANGED_EVENT);
}

export function loadBinItems() {
	if (!canUseStorage()) return [];
	const parsed = asArray(safeParseJSON(window.localStorage.getItem(BIN_KEY), []));
	return parsed.map((item) => normalizeBinItem(item)).filter(Boolean).sort((a, b) => b.deletedAt - a.deletedAt);
}

export function getBinSubscriptionEventName() {
	return BIN_CHANGED_EVENT;
}

function pushBinItem(item) {
	const normalized = normalizeBinItem({
		id: makeId("bin"),
		deletedAt: Date.now(),
		...item,
	});
	if (!normalized) return null;
	const next = [normalized, ...loadBinItems()];
	saveBinItems(next);
	return normalized;
}

function removeDiaryFromRecent(diaryId) {
	const id = String(diaryId ?? "");
	const recent = readArrayKey(RECENT_DIARIES_KEY);
	const next = recent.filter((r) => String(r?.id ?? "") !== id);
	writeArrayKey(RECENT_DIARIES_KEY, next);
	emit("kicklog:recentDiariesChanged");
}

function getDiarySnapshot(diaryId) {
	const id = String(diaryId ?? "");
	return {
		entries: readArrayKey(diaryEntriesKey(id)),
		entrySavedRaw: canUseStorage() ? window.localStorage.getItem(diaryEntrySavedKey(id)) : null,
		entryDraftRaw: canUseStorage() ? window.localStorage.getItem(diaryEntryDraftKey(id)) : null,
		chaptersSavedRaw: canUseStorage() ? window.localStorage.getItem(diaryChaptersSavedKey(id)) : null,
		chaptersDraftRaw: canUseStorage() ? window.localStorage.getItem(diaryChaptersDraftKey(id)) : null,
		activeChapterRaw: canUseStorage() ? window.localStorage.getItem(diaryActiveChapterKey(id)) : null,
	};
}

function chapterCountFromSnapshot(snapshot) {
	const draft = safeParseJSON(snapshot?.chaptersDraftRaw, null);
	if (Array.isArray(draft) && draft.length > 0) return draft.length;
	const saved = safeParseJSON(snapshot?.chaptersSavedRaw, null);
	if (Array.isArray(saved) && saved.length > 0) return saved.length;
	return 0;
}

export function moveDiaryToBin(diaryId) {
	if (!canUseStorage()) return { ok: false, message: "Storage unavailable." };
	const id = String(diaryId ?? "").trim();
	if (!id) return { ok: false, message: "Missing diary id." };

	const diaries = loadDiaries();
	const diary = diaries.find((d) => String(d?.id ?? d?.createdAt ?? "") === id);
	if (!diary) return { ok: false, message: "Diary not found." };

	const snapshot = getDiarySnapshot(id);
	const folders = loadFolders();
	const folder = folders.find((f) => String(f?.id ?? "") === String(diary.folderId ?? ""));

	const item = pushBinItem({
		type: BIN_TYPES.diary,
		entityId: id,
		label: diary.name || "Untitled diary",
		payload: {
			diary,
			snapshot,
			folderName: folder?.name ?? "Unfiled",
			entryCount: Array.isArray(snapshot.entries) ? snapshot.entries.length : 0,
			chapterCount: chapterCountFromSnapshot(snapshot),
		},
	});

	saveDiaries(diaries.filter((d) => String(d?.id ?? d?.createdAt ?? "") !== id));

	try {
		const activeId = window.localStorage.getItem(ACTIVE_DIARY_KEY);
		if (String(activeId ?? "") === id) {
			window.localStorage.removeItem(ACTIVE_DIARY_KEY);
		}
		const rawMeta = window.localStorage.getItem(DIARY_META_KEY);
		const parsedMeta = safeParseJSON(rawMeta, null);
		const metaId = String(parsedMeta?.id ?? parsedMeta?.createdAt ?? "");
		if (metaId === id) {
			window.localStorage.removeItem(DIARY_META_KEY);
		}
		window.localStorage.removeItem(diaryEntriesKey(id));
		window.localStorage.removeItem(diaryEntrySavedKey(id));
		window.localStorage.removeItem(diaryEntryDraftKey(id));
		window.localStorage.removeItem(diaryChaptersSavedKey(id));
		window.localStorage.removeItem(diaryChaptersDraftKey(id));
		window.localStorage.removeItem(diaryActiveChapterKey(id));
	} catch {
		// ignore
	}

	removeDiaryFromRecent(id);
	emit("kicklog:diaryEntriesChanged");
	return { ok: true, item };
}

export function moveFolderToBin(folderId) {
	const id = String(folderId ?? "").trim();
	if (!id) return { ok: false, message: "Missing folder id." };
	const folders = loadFolders();
	const folder = folders.find((f) => String(f?.id ?? "") === id);
	if (!folder) return { ok: false, message: "Folder not found." };

	const linkedDiaryCount = loadDiaries().filter((d) => String(d?.folderId ?? "") === id).length;
	const item = pushBinItem({
		type: BIN_TYPES.folder,
		entityId: id,
		label: folder.name || "Untitled folder",
		payload: {
			folder,
			linkedDiaryCount,
		},
	});

	saveFolders(folders.filter((f) => String(f?.id ?? "") !== id));
	return { ok: true, item };
}

export function moveSessionToBin({ diaryId, entry }) {
	const id = String(diaryId ?? "").trim();
	if (!id || !entry || typeof entry !== "object") {
		return { ok: false, message: "Invalid session payload." };
	}
	const entryId = String(entry.id ?? "").trim();
	if (!entryId) return { ok: false, message: "Session id missing." };

	const item = pushBinItem({
		type: BIN_TYPES.session,
		entityId: entryId,
		label: `${entry.type === "match" ? "Match" : "Practice"} session`,
		payload: {
			diaryId: id,
			entry,
		},
	});
	return { ok: true, item };
}

export function moveChapterToBin({ diaryId, chapter }) {
	const id = String(diaryId ?? "").trim();
	if (!id || !chapter || typeof chapter !== "object") {
		return { ok: false, message: "Invalid chapter payload." };
	}
	const chapterId = String(chapter.id ?? "").trim();
	if (!chapterId) return { ok: false, message: "Chapter id missing." };

	const item = pushBinItem({
		type: BIN_TYPES.chapter,
		entityId: chapterId,
		label: chapter.title || "Untitled chapter",
		payload: {
			diaryId: id,
			chapter,
		},
	});
	return { ok: true, item };
}

export function moveNoteToBin(eventItem) {
	if (!eventItem || typeof eventItem !== "object") {
		return { ok: false, message: "Invalid note payload." };
	}
	const noteId = String(eventItem.id ?? "").trim();
	if (!noteId) return { ok: false, message: "Note id missing." };

	const item = pushBinItem({
		type: BIN_TYPES.note,
		entityId: noteId,
		label: String(eventItem.title || "Untitled note"),
		payload: { event: eventItem },
	});
	return { ok: true, item };
}

function restoreDiary(item) {
	const diary = item?.payload?.diary;
	if (!diary || typeof diary !== "object") return { ok: false, message: "Diary payload missing." };
	const id = String(diary.id ?? diary.createdAt ?? "").trim();
	if (!id) return { ok: false, message: "Diary id missing." };

	const diaries = loadDiaries();
	if (!diaries.some((d) => String(d?.id ?? d?.createdAt ?? "") === id)) {
		saveDiaries([diary, ...diaries]);
	}

	const snapshot = item?.payload?.snapshot || {};
	try {
		window.localStorage.setItem(diaryEntriesKey(id), JSON.stringify(asArray(snapshot.entries)));
		if (snapshot.entrySavedRaw != null) window.localStorage.setItem(diaryEntrySavedKey(id), String(snapshot.entrySavedRaw));
		if (snapshot.entryDraftRaw != null) window.localStorage.setItem(diaryEntryDraftKey(id), String(snapshot.entryDraftRaw));
		if (snapshot.chaptersSavedRaw != null) window.localStorage.setItem(diaryChaptersSavedKey(id), String(snapshot.chaptersSavedRaw));
		if (snapshot.chaptersDraftRaw != null) window.localStorage.setItem(diaryChaptersDraftKey(id), String(snapshot.chaptersDraftRaw));
		if (snapshot.activeChapterRaw != null) window.localStorage.setItem(diaryActiveChapterKey(id), String(snapshot.activeChapterRaw));
	} catch {
		// ignore
	}
	emit("kicklog:diaryEntriesChanged");
	return { ok: true };
}

function restoreFolder(item) {
	const folder = item?.payload?.folder;
	if (!folder || typeof folder !== "object") return { ok: false, message: "Folder payload missing." };
	const id = String(folder.id ?? "").trim();
	if (!id) return { ok: false, message: "Folder id missing." };

	const folders = loadFolders();
	if (!folders.some((f) => String(f?.id ?? "") === id)) {
		saveFolders([folder, ...folders]);
	}
	return { ok: true };
}

function restoreSession(item) {
	const diaryId = String(item?.payload?.diaryId ?? "").trim();
	const entry = item?.payload?.entry;
	if (!diaryId || !entry || typeof entry !== "object") {
		return { ok: false, message: "Session payload missing." };
	}

	const diaryExists = loadDiaries().some((d) => String(d?.id ?? d?.createdAt ?? "") === diaryId);
	if (!diaryExists) {
		return { ok: false, message: "Restore diary first, then this session." };
	}

	const key = diaryEntriesKey(diaryId);
	const entries = readArrayKey(key);
	const entryId = String(entry.id ?? "");
	if (!entries.some((e) => String(e?.id ?? "") === entryId)) {
		window.localStorage.setItem(key, JSON.stringify([entry, ...entries]));
		emit("kicklog:diaryEntriesChanged");
	}
	return { ok: true };
}

function restoreChapter(item) {
	const diaryId = String(item?.payload?.diaryId ?? "").trim();
	const chapter = item?.payload?.chapter;
	if (!diaryId || !chapter || typeof chapter !== "object") {
		return { ok: false, message: "Chapter payload missing." };
	}

	const diaryExists = loadDiaries().some((d) => String(d?.id ?? d?.createdAt ?? "") === diaryId);
	if (!diaryExists) {
		return { ok: false, message: "Restore diary first, then this chapter." };
	}

	const draftKey = diaryChaptersDraftKey(diaryId);
	const savedKey = diaryChaptersSavedKey(diaryId);
	const rawDraft = window.localStorage.getItem(draftKey);
	const rawSaved = window.localStorage.getItem(savedKey);
	const targetKey = rawDraft != null ? draftKey : savedKey;
	const base = safeParseJSON(rawDraft ?? rawSaved, []);
	const list = Array.isArray(base) ? base : [];
	const chapterId = String(chapter.id ?? "");
	if (!list.some((c) => String(c?.id ?? "") === chapterId)) {
		window.localStorage.setItem(targetKey, JSON.stringify([...list, chapter]));
	}
	return { ok: true };
}

function restoreNote(item) {
	const eventItem = item?.payload?.event;
	if (!eventItem || typeof eventItem !== "object") {
		return { ok: false, message: "Note payload missing." };
	}

	const events = loadScheduleEvents();
	const noteId = String(eventItem.id ?? "");
	if (!events.some((e) => String(e?.id ?? "") === noteId)) {
		saveScheduleEvents([eventItem, ...events]);
	}
	return { ok: true };
}

function restoreByType(item) {
	if (item.type === BIN_TYPES.diary) return restoreDiary(item);
	if (item.type === BIN_TYPES.folder) return restoreFolder(item);
	if (item.type === BIN_TYPES.session) return restoreSession(item);
	if (item.type === BIN_TYPES.chapter) return restoreChapter(item);
	if (item.type === BIN_TYPES.note) return restoreNote(item);
	return { ok: false, message: "Unsupported bin item type." };
}

export function restoreBinItem(binId) {
	const id = String(binId ?? "").trim();
	if (!id) return { ok: false, message: "Missing bin item id." };
	const items = loadBinItems();
	const item = items.find((x) => x.id === id);
	if (!item) return { ok: false, message: "Bin item not found." };

	const result = restoreByType(item);
	if (!result.ok) return result;
	saveBinItems(items.filter((x) => x.id !== id));
	return { ok: true, item };
}

export function permanentlyDeleteBinItem(binId) {
	const id = String(binId ?? "").trim();
	if (!id) return { ok: false, message: "Missing bin item id." };
	const items = loadBinItems();
	const has = items.some((x) => x.id === id);
	if (!has) return { ok: false, message: "Bin item not found." };
	saveBinItems(items.filter((x) => x.id !== id));
	return { ok: true };
}

export function emptyBinPermanently() {
	saveBinItems([]);
	return { ok: true };
}
