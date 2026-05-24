import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from "react";

const DEFAULT_ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export type ImageDropZoneValidate = (
  file: File,
) => { ok: true } | { ok: false; reason: string };

export interface UseImageDropZoneOptions {
  /** drop / file picker change 로 통과한 파일들이 전달되는 콜백. */
  onFiles: (files: File[]) => void | Promise<void>;
  /** 허용 MIME 타입. 기본 ["image/jpeg", "image/png", "image/webp"]. */
  accept?: string[];
  /** 파일당 최대 바이트. 기본 10 * 1024 * 1024 (10MB). */
  maxSize?: number;
  /** 다중 선택 허용. 기본 true. false 이면 첫 파일만 통과. */
  multiple?: boolean;
  /** host 가 추가 검증을 끼울 수 있는 hook. accept/maxSize 검증 통과 후 호출. */
  validate?: ImageDropZoneValidate;
  /** true 이면 모든 드래그/드롭/체인지 콜백이 no-op. */
  disabled?: boolean;
}

export interface UseImageDropZoneReturn {
  /** 현재 드래그 over 상태. */
  isDragging: boolean;
  /** 드롭 영역에 전개할 prop 집합. */
  dropProps: {
    onDragEnter: (e: DragEvent) => void;
    onDragOver: (e: DragEvent) => void;
    onDragLeave: (e: DragEvent) => void;
    onDrop: (e: DragEvent) => void;
  };
  /** `<input type="file">` 에 전개할 prop 집합. */
  inputProps: {
    type: "file";
    accept: string;
    multiple: boolean;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  };
  /** 직전 drop / change 에서 reject 된 파일들의 사유. 매 새 이벤트마다 초기화. */
  rejectedReasons: string[];
}

/** host 독립 이미지 드롭존 hook. 업로드 자체는 수행하지 않고 검증 통과 파일만 onFiles 로 위임. */
export function useImageDropZone(opts: UseImageDropZoneOptions): UseImageDropZoneReturn {
  const {
    onFiles,
    accept = DEFAULT_ACCEPT,
    maxSize = DEFAULT_MAX_SIZE,
    multiple = true,
    validate,
    disabled = false,
  } = opts;

  const [isDragging, setIsDragging] = useState(false);
  const [rejectedReasons, setRejectedReasons] = useState<string[]>([]);
  const dragCounter = useRef(0);

  const processFiles = useCallback(
    (incoming: File[]) => {
      if (disabled) return;
      const accepted: File[] = [];
      const rejected: string[] = [];

      const slice = multiple ? incoming : incoming.slice(0, 1);

      for (const file of slice) {
        if (accept.length > 0 && !accept.includes(file.type)) {
          rejected.push(`${file.name}: 지원하지 않는 형식 (${file.type || "unknown"})`);
          continue;
        }
        if (file.size > maxSize) {
          rejected.push(
            `${file.name}: 파일 크기 초과 (${(file.size / 1024 / 1024).toFixed(1)}MB > ${(
              maxSize /
              1024 /
              1024
            ).toFixed(1)}MB)`,
          );
          continue;
        }
        if (validate) {
          const result = validate(file);
          if (!result.ok) {
            rejected.push(`${file.name}: ${result.reason}`);
            continue;
          }
        }
        accepted.push(file);
      }

      setRejectedReasons(rejected);
      if (accepted.length > 0) {
        void onFiles(accepted);
      }
    },
    [accept, maxSize, multiple, validate, disabled, onFiles],
  );

  const onDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      dragCounter.current += 1;
      // DataTransfer.types may not be present in some test envs
      const types = e.dataTransfer?.types;
      if (!types || (typeof types.includes === "function" ? types.includes("Files") : Array.from(types).includes("Files"))) {
        setIsDragging(true);
      }
    },
    [disabled],
  );

  const onDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
    [],
  );

  const onDragLeave = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      dragCounter.current = Math.max(0, dragCounter.current - 1);
      if (dragCounter.current === 0) {
        setIsDragging(false);
      }
    },
    [disabled],
  );

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);
      if (disabled) return;
      const incoming = Array.from(e.dataTransfer?.files ?? []);
      processFiles(incoming);
    },
    [disabled, processFiles],
  );

  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const incoming = Array.from(e.target.files ?? []);
      processFiles(incoming);
      // 동일 파일 재선택을 허용하기 위해 input value 초기화 (jsdom 에서 안전)
      try {
        e.target.value = "";
      } catch {}
    },
    [disabled, processFiles],
  );

  return {
    isDragging,
    dropProps: { onDragEnter, onDragOver, onDragLeave, onDrop },
    inputProps: {
      type: "file",
      accept: accept.join(","),
      multiple,
      onChange,
    },
    rejectedReasons,
  };
}
