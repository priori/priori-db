import { useRef, useState } from 'react';
import { useEvent } from 'util/useEvent';

export function FavoriteControl({
  onSave,
  saved,
  style,
}: {
  onSave: (name: string) => void;
  saved: boolean;
  style?: React.CSSProperties;
}) {
  const [openFav, setOpenFav] = useState(false);
  const [name, setName] = useState('');

  const ref = useRef<HTMLSpanElement>(null);
  const inputRef = useRef({ el: null } as { el: HTMLInputElement | null });
  const startFavorite = useEvent(() => {
    setOpenFav(true);
  });

  const close = useEvent(() => {
    setName('');
    setOpenFav(false);
  });

  const onBlurCapture = useEvent(() => {
    setTimeout(() => {
      const { activeElement } = document;
      if (!ref.current?.contains(activeElement as Node)) {
        close();
      }
    }, 1);
  });

  const inputRefFunc = useEvent((el: HTMLInputElement | null) => {
    el?.focus();
    inputRef.current.el = el;
  });

  const disabled = name.length === 0;

  const onKeyDown = useEvent((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !disabled) {
      onSave(name);
      close();
    }
    if (e.key === 'Escape') {
      close();
    }
  });

  const onChange = useEvent((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  });

  const onDialogFocus = useEvent(() => {
    inputRef.current.el?.focus();
  });

  const onSaveClick = useEvent(() => {
    onSave(name);
    close();
  });

  return (
    <span className="favorite" ref={ref} style={style}>
      <i
        className={`fa fa-star${saved ? ' saved' : ''}`}
        onClick={startFavorite}
      />
      {openFav ? (
        <div
          className="favorite-dialog"
          tabIndex={0}
          onFocus={onDialogFocus}
          onBlurCapture={onBlurCapture}
        >
          <input
            ref={inputRefFunc}
            type="text"
            value={name}
            onKeyDown={onKeyDown}
            onChange={onChange}
          />
          <div className="actions">
            <button
              type="button"
              onClick={close}
              style={{ fontWeight: 'normal' }}
            >
              Cancel <i className="fa fa-undo" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={disabled ? undefined : onSaveClick}
            >
              Ok <i className="fa fa-check" />
            </button>
          </div>
        </div>
      ) : null}
    </span>
  );
}
