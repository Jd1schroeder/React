import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { WORK_ORDER_ATTACHMENT_MAX_BYTES } from "../../utils/workOrderAttachments";
import "./RequiredStatusCommentModal.css";

const MAX_ATTACHMENTS = 20;

export function RequiredStatusCommentModal({ workOrderLabel = "Work Order", status, requirement = "mandatory", isSaving = false, error = "", onCancel, onSubmit }) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState("");
  const inputRef = useRef(null);
  const statusName = status === "On Hold" ? "On Hold" : status === "Skipped" ? "Skipped" : "Canceled";
  const prompt = status === "On Hold"
    ? `Why are you putting this ${workOrderLabel.toLowerCase()} on hold?`
    : `Why was this ${workOrderLabel.toLowerCase()} ${status === "Skipped" ? "skipped" : "canceled"}?`;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSaving) onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onCancel]);

  const addFiles = (nextFiles) => {
    setFileError("");
    const invalid = nextFiles.find((file) => !file.size || file.size > WORK_ORDER_ATTACHMENT_MAX_BYTES || file.name.length > 255);
    if (invalid) {
      setFileError(`${invalid.name} must be between 1 byte and 10 MB.`);
      return;
    }
    const next = [...files, ...nextFiles].filter((file, index, all) => all.findIndex((candidate) => candidate.name === file.name && candidate.size === file.size && candidate.lastModified === file.lastModified) === index);
    if (next.length > MAX_ATTACHMENTS) {
      setFileError(`Attach up to ${MAX_ATTACHMENTS} files.`);
      return;
    }
    setFiles(next);
  };

  const submit = (event) => {
    event.preventDefault();
    if (!body.trim() || isSaving) return;
    onSubmit({ body, files });
  };

  return (
    <div className="required-status-comment-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) onCancel(); }}>
      <section className="required-status-comment-modal" role="dialog" aria-modal="true" aria-labelledby="required-status-comment-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="required-status-comment-header"><h2 id="required-status-comment-title">{statusName}</h2><button type="button" className="required-status-comment-close" aria-label="Close" onClick={onCancel} disabled={isSaving}><X size={20} /></button></header>
        <form onSubmit={submit}>
          <div className="required-status-comment-content">
            <label htmlFor="required-status-comment-input"><strong>{prompt}</strong>{requirement === "mandatory" && <span> (Required)</span>}</label>
            <textarea id="required-status-comment-input" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a comment..." rows={3} maxLength={10000} disabled={isSaving} autoFocus />
            <button type="button" className="required-status-comment-dropzone" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(Array.from(event.dataTransfer.files ?? [])); }} disabled={isSaving}>
              <Camera size={22} aria-hidden="true" />
              <span>Add Pictures/Files</span>
              <input ref={inputRef} type="file" multiple onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} disabled={isSaving} />
            </button>
            {files.length > 0 && <ul className="required-status-comment-files" aria-label="Attached files">{files.map((file, index) => <li key={`${file.name}-${file.size}-${index}`}>{file.name}<button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}><X size={14} /></button></li>)}</ul>}
            {(fileError || error) && <p className="required-status-comment-error" role="alert">{fileError || error}</p>}
          </div>
          <footer className="required-status-comment-footer"><button type="button" className="required-status-comment-clear" onClick={() => { setBody(""); setFiles([]); setFileError(""); }} disabled={isSaving}>Clear</button><Button type="submit" variant="primary" disabled={isSaving || (requirement === "mandatory" && !body.trim())}>{isSaving ? "Submitting..." : "Submit"}</Button></footer>
        </form>
      </section>
    </div>
  );
}
