import { Dialog } from 'components/util/Dialog/Dialog';
import { db } from 'db/db';
import React from 'react';

export function SettingsParams({
  params,
  refresh,
}: {
  params: {
    name: string;
    setting: string;
    description: string;
  }[];
  refresh: () => void;
}) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showAll, setShowAll] = React.useState(false);
  const [form, setForm] = React.useState<{
    name: string;
    value: string;
  } | null>(null);
  const valueParts = searchQuery.toLocaleLowerCase().split(' ');
  const searchResult = params.filter(
    (param) =>
      !searchQuery ||
      valueParts.every((part) => param.name.toLowerCase().includes(part)) ||
      valueParts.every((part) => param.setting.toLowerCase().includes(part)) ||
      valueParts.every((part) =>
        param.description.toLowerCase().includes(part),
      ),
  );
  async function save() {
    setForm(null);
    db().variables.update(form!.name, form!.value);
    refresh();
  }
  return (
    <>
      <h2>Params</h2>
      <div style={{ marginBottom: 3 }}>
        <input
          type="text"
          className="params--search"
          onChange={(e) => setSearchQuery(e.target.value)}
        />{' '}
        <i className="fa fa-search" style={{ position: 'static' }} />
        {searchQuery ? (
          searchResult.length === 0 ? (
            <span style={{ color: '#d11', fontSize: 13, marginLeft: 4 }}>
              No results for &ldquo;<strong>{searchQuery}</strong>&rdquo;
            </span>
          ) : (
            <strong style={{ fontSize: 13, marginLeft: 4 }}>
              {searchResult.length} result{searchResult.length === 1 ? '' : 's'}
            </strong>
          )
        ) : null}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {(showAll ? searchResult : searchResult.slice(0, 20)).map((param) => (
          <React.Fragment key={param.name}>
            <span
              className="pill-button"
              style={{ fontWeight: 'normal' }}
              data-hint={
                param.description
                  ? `${param.name}: ${param.description}`
                  : undefined
              }
              onClick={() =>
                setForm({ name: param.name, value: param.setting })
              }
            >
              <strong>
                {param.name.length > 20
                  ? `${param.name.slice(0, 10)}...${param.name.slice(-10)}`
                  : param.name}
                :
              </strong>{' '}
              {param.setting.length > 70 ? (
                <>
                  {param.setting.slice(0, 30)}...{param.setting.slice(-30)}
                </>
              ) : (
                param.setting || <strong style={{ opacity: 0.3 }}>-</strong>
              )}
              <i className="fa fa-pencil" style={{ marginLeft: 4 }} />
            </span>
            {form?.name === param.name ? (
              <Dialog onBlur={() => setForm(null)} relativeTo="previousSibling">
                <div style={{ userSelect: 'text' }}>
                  <div
                    style={{
                      lineHeight: 1.25,
                      marginBottom: 10,
                      fontWeight: 'bold',
                      fontSize: 20,
                      maxWidth: 270,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      wordBreak: 'break-word',
                    }}
                  >
                    {param.name.split('_').map((part, i) => (
                      <React.Fragment key={i}>
                        {i > 0 ? <wbr /> : null}
                        {i > 0 ? '_' : null}
                        {i > 0 ? <wbr /> : null}
                        {part}
                      </React.Fragment>
                    ))}
                  </div>
                  <div
                    style={{
                      maxWidth: 270,
                      lineHeight: 1.2,
                      fontSize: 15,
                      textAlign: 'left',
                    }}
                  >
                    {param.description}
                  </div>
                  <div>
                    <input
                      type="text"
                      defaultValue={param.setting}
                      style={{ width: 270, marginTop: 10 }}
                      onChange={(e) => {
                        const { value } = e.target;
                        setForm({ ...form!, value });
                      }}
                    />
                  </div>
                  <div>
                    <button
                      className="button"
                      style={{ fontWeight: 'normal', userSelect: 'none' }}
                      onClick={() => setForm(null)}
                    >
                      Cancel <i className="fa fa-rotate-left" />
                    </button>
                    <button
                      className="button"
                      onClick={save}
                      style={{ userSelect: 'none' }}
                    >
                      Save <i className="fa fa-check" />
                    </button>
                  </div>
                </div>
              </Dialog>
            ) : null}
          </React.Fragment>
        ))}
        {searchResult.length > 20 ? (
          showAll ? (
            <span
              className="pill-button param--more"
              onClick={() => setShowAll(false)}
            >
              <strong>
                Show Less <i className="fa fa-caret-up" />
              </strong>
            </span>
          ) : (
            <span className="pill-button" onClick={() => setShowAll(true)}>
              <strong>+{searchResult.length - 20} more...</strong>
            </span>
          )
        ) : null}
      </div>
    </>
  );
}
