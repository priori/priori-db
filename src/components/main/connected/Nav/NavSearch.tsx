import { useDeferredValue, useState } from 'react';
import { NavSchema, Tab } from 'types';
import { useEvent } from 'util/useEvent';
import { useDeferredValueFix } from './Nav';
import { NavSearchCore } from './NavSearchCore';

export const NavSearch = ({
  schemas,
  tabs,
}: {
  schemas: NavSchema[];
  tabs: Tab[];
}) => {
  const [searchText, setSearchText] = useState('');
  const [focus, setFocus] = useState(false);
  const search = (useDeferredValue as useDeferredValueFix<string>)(searchText, {
    timeoutMs: 300,
  });
  const onChange = useEvent((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  });
  const onKeyDown = useEvent((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      (e.target as HTMLInputElement).blur();
    }
  });
  const onFocus = useEvent(() => {
    setFocus(true);
  });
  const onBlur = useEvent(() => {
    setFocus(false);
  });
  const onCloseClick = useEvent(() => {
    setSearchText('');
  });

  return (
    <>
      <div className={`nav--search ${focus ? 'focus' : ''}`}>
        <input
          type="text"
          onChange={onChange}
          onKeyDown={onKeyDown}
          value={searchText}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {searchText ? (
          <i className="fa fa-close" onClick={onCloseClick} />
        ) : (
          <i className="fa fa-search" />
        )}
      </div>
      <NavSearchCore
        focus={focus}
        search={search}
        schemas={schemas}
        tabs={tabs}
      />
    </>
  );
};
