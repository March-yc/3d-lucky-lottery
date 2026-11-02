import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Trash2, Upload, RotateCcw, Save, Users, Gift, Edit3, Check, Music, Volume2, Play, Square, Crown, Sparkles, VolumeX } from 'lucide-react';
import * as XLSX from 'xlsx';
import { bgmManager } from '../utils/bgm';

export default function SettingsModal({
  isOpen,
  onClose,
  title,
  onUpdateTitle,
  prizes,
  onUpdatePrizes,
  candidates,
  onUpdateCandidates,
  onResetWinners,
  onResetAllToDefault,
  winnersCount,
  isBgmEnabled,
  onToggleBgm
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('prizes'); // 'prizes' | 'candidates' | 'audio'
  const [localTitle, setLocalTitle] = useState(title);
  const [localPrizes, setLocalPrizes] = useState(JSON.parse(JSON.stringify(prizes)));
  const [pasteText, setPasteText] = useState('');
  const [saveToast, setSaveToast] = useState(false);
  const fileInputRef = useRef(null);

  // 音樂與音效控制狀態
  const [bgmEnabled, setBgmEnabled] = useState(bgmManager.isEnabled);
  const [bgmVol, setBgmVol] = useState(bgmManager.bgmVolume);
  const [sfxVol, setSfxVol] = useState(bgmManager.sfxVolume);
  const [customAudioName, setCustomAudioName] = useState(bgmManager.customAudioName);
  const [previewState, setPreviewState] = useState('none'); // 'none' | 'default' | 'regular_win' | 'grand_win'
  const audioFileInputRef = useRef(null);

  // 關閉彈窗時停止試聽
  useEffect(() => {
    return () => {
      bgmManager.stopPreview();
    };
  }, []);

  const handleTogglePreview = (type) => {
    if (previewState === type) {
      bgmManager.stopPreview();
      setPreviewState('none');
    } else {
      bgmManager.previewTrack(type);
      setPreviewState(type);
      if (type === 'regular_win') {
        setTimeout(() => setPreviewState(prev => prev === 'regular_win' ? 'none' : prev), 3500);
      } else if (type === 'grand_win') {
        setTimeout(() => setPreviewState(prev => prev === 'grand_win' ? 'none' : prev), 5500);
      }
    }
  };

  const handleAudioUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    bgmManager.setCustomAudioFile(file);
    setCustomAudioName(file.name);
    alert(`成功载入自定义音乐「${file.name}」！已作为默认背景音乐播放。`);
    e.target.value = '';
  };

  const handleClearAudio = () => {
    bgmManager.clearCustomAudio();
    setCustomAudioName('');
    alert('已恢复为系统默认背景音乐！');
  };

  // 儲存獎項設定
  const handleSavePrizes = () => {
    onUpdatePrizes(localPrizes);
    onUpdateTitle(localTitle);
    showToast();
  };

  const showToast = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  // 修改獎項屬性
  const handlePrizeChange = (id, field, value) => {
    setLocalPrizes(prev =>
      prev.map(p => {
        if (p.id === id) {
          return {
            ...p,
            [field]: field === 'quota' ? Math.max(1, parseInt(value) || 1) : value
          };
        }
        return p;
      })
    );
  };

  // 新增加碼獎項
  const handleAddPrize = () => {
    const newId = `prize-${Date.now()}`;
    const newPrize = {
      id: newId,
      name: `加码奖 ${localPrizes.length - 3 > 0 ? localPrizes.length - 3 : ''}`.trim(),
      quota: 2,
      item: '加码红包',
      group: '1/1组',
      color: '#f59e0b'
    };
    setLocalPrizes(prev => [...prev, newPrize]);
  };

  // 刪除自定義獎項
  const handleDeletePrize = (id) => {
    if (localPrizes.length <= 1) {
      alert('至少需要保留一个奖项');
      return;
    }
    setLocalPrizes(prev => prev.filter(p => p.id !== id));
  };

  // 智能欄位探測：支援中英文大小寫、簡繁體、包含前後空白、模糊關鍵字
  const detectCandidateFromRow = (row, rowIndex, rawCols) => {
    const idKeys = [
      '工号', '工號', '员工工号', '員工工號', '员工号', '員工號', '员工编号', '員工編號',
      '编号', '編號', '序号', '序號', 'id', 'empid', 'employeeid', 'badge', 'no', 'code', 'number'
    ];
    const nameKeys = [
      '姓名', '名字', '员工姓名', '員工姓名', '员工', '員工', '人员', '人員',
      'name', 'fullname', 'user', 'username', 'employee', '候选人', '候選人'
    ];
    const deptKeys = [
      '部门', '部門', '所属部门', '所属部門', '组别', '組別', '单位', '單位',
      'department', 'dept', 'team', 'group', 'division'
    ];

    let foundId = null;
    let foundName = null;
    let foundDept = null;

    const rowKeys = Object.keys(row);

    // 1. 先用 key 精準或包含匹配
    for (const key of rowKeys) {
      const cleanKey = String(key).trim().toLowerCase();
      const val = row[key];
      if (val === undefined || val === null || String(val).trim() === '') continue;
      const strVal = String(val).trim();

      if (!foundId && idKeys.some(k => cleanKey === k || cleanKey.includes(k))) {
        foundId = strVal;
        continue;
      }
      if (!foundName && nameKeys.some(k => cleanKey === k || cleanKey.includes(k))) {
        foundName = strVal;
        continue;
      }
      if (!foundDept && deptKeys.some(k => cleanKey === k || cleanKey.includes(k))) {
        foundDept = strVal;
        continue;
      }
    }

    // 2. 如果通過 key 沒抓齊，嘗試使用原始列索引回退 (第一列為工號，第二列為姓名)
    if (rawCols && Array.isArray(rawCols)) {
      const nonEmptyCols = rawCols.map(c => String(c || '').trim()).filter(c => c.length > 0);
      if (!foundName && nonEmptyCols.length >= 2) {
        if (!foundId) foundId = nonEmptyCols[0];
        foundName = nonEmptyCols[1];
        if (!foundDept && nonEmptyCols.length >= 3) foundDept = nonEmptyCols[2];
      } else if (!foundName && nonEmptyCols.length === 1) {
        foundName = nonEmptyCols[0];
      }
    }

    // 若姓名仍為空，但找到了工號，檢查是否值顛倒
    if (!foundName && foundId) {
      if (/^[\u4e00-\u9fa5]{2,6}$/.test(foundId)) {
        foundName = foundId;
        foundId = `P${rowIndex + 1}`;
      }
    }

    if (!foundName && !foundId) {
      return null;
    }

    return {
      id: foundId || `P${rowIndex + 1}`,
      name: foundName || `候选人${rowIndex + 1}`,
      department: foundDept || '员工'
    };
  };

  // 處理 Excel/CSV 檔案上傳解析（超強相容性）
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!json || json.length === 0) {
          alert('未能从文件中读取到有效数据，请确保表格内包含数据行！');
          return;
        }

        const parsedList = [];
        const seenIds = new Set();

        json.forEach((row, idx) => {
          const rawCols = rawRows[idx + 1] || Object.values(row);
          const candidate = detectCandidateFromRow(row, idx, rawCols);
          if (candidate && candidate.name) {
            let uniqueId = candidate.id;
            if (seenIds.has(uniqueId)) {
              uniqueId = `${candidate.id}_${idx + 1}`;
            }
            seenIds.add(uniqueId);

            parsedList.push({
              id: uniqueId,
              name: candidate.name,
              department: candidate.department
            });
          }
        });

        if (parsedList.length === 0) {
          alert('未能识别到有效的姓名或工号，请检查表格是否包含「姓名」与「工号」列！');
          return;
        }

        // 若當前已有歷史中獎記錄，詢問是否清空中獎歷史全新開抽
        if (winnersCount > 0) {
          const confirmReset = window.confirm(
            `成功解析到 ${parsedList.length} 位候选人！\n\n检测到当前已有 ${winnersCount} 条历史中奖记录：\n• 点击【确定】：导入新名单并【清空历史中奖】，全新开抽\n• 点击【取消】：导入新名单并【保留历史中奖】`
          );
          if (confirmReset) {
            onResetWinners();
          }
        }

        onUpdateCandidates(parsedList);
        alert(`成功导入 ${parsedList.length} 位候选人名单！已实时同步至 3D 摇奖池。`);
      } catch (err) {
        console.error(err);
        alert('解析 Excel 文件失败，请确保文件为标准的 .xlsx, .xls 或 .csv 格式！');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // 批量文字貼上匯入
  const handleBatchPaste = () => {
    if (!pasteText.trim()) return;
    const lines = pasteText.split('\n').filter(l => l.trim().length > 0);
    const parsed = lines.map((line, idx) => {
      const parts = line.trim().split(/[\s,，\t]+/);
      if (parts.length >= 2) {
        return { id: parts[0], name: parts[1], department: parts[2] || '员工' };
      } else {
        return { id: `P${candidates.length + idx + 1}`, name: parts[0], department: '员工' };
      }
    });

    onUpdateCandidates([...candidates, ...parsed]);
    setPasteText('');
    alert(`成功添加 ${parsed.length} 位候选人！`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md pointer-events-auto select-none">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-stone-900 via-stone-950 to-black border border-amber-500/30 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-stone-100">
        {/* 頂部彩色微光條 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-rose-500 to-amber-300" />

        {/* 頂部標題 */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-amber-100 font-serif">
              抽奖系统控制台
            </h3>
            {saveToast && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full animate-fade-in">
                <Check className="w-3.5 h-3.5" /> 已保存
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-stone-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 分頁 Tab */}
        <div className="flex px-6 pt-3 border-b border-white/10 bg-black/20 gap-2">
          <button
            onClick={() => {
              bgmManager.stopPreview();
              setPreviewState('none');
              setActiveTab('prizes');
            }}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'prizes'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>奖项与名额设置</span>
          </button>
          <button
            onClick={() => {
              bgmManager.stopPreview();
              setPreviewState('none');
              setActiveTab('candidates');
            }}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'candidates'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>名单与奖池管理 ({candidates.length}人)</span>
          </button>
          <button
            onClick={() => {
              bgmManager.stopPreview();
              setPreviewState('none');
              setActiveTab('audio');
            }}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'audio'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>音乐与音效设置</span>
          </button>
        </div>

        {/* 內容區域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* 獎項設定 Tab */}
          {activeTab === 'prizes' && (
            <div className="space-y-4">
              {/* 活動主標題編輯 */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <label className="block text-xs font-semibold text-amber-200/80 mb-2">
                  主标题名称（支持自定义年会/生日会/狂欢夜）
                </label>
                <input
                  type="text"
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/20 text-stone-100 focus:outline-none focus:border-amber-400 text-base"
                  placeholder="例如：xxx欢乐抽奖"
                />
              </div>

              {/* 各獎項清單編輯 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-200 tracking-wider uppercase">
                    奖项名额列表（一等~四等预设与自由加码）
                  </span>
                  <button
                    onClick={handleAddPrize}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-xs font-medium flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>新增加码奖项</span>
                  </button>
                </div>

                {localPrizes.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-amber-500/20 hover:border-amber-400/40 transition-all"
                  >
                    {/* 獎項序號 */}
                    <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-bold font-mono">
                      {idx + 1}
                    </span>

                    {/* 獎項名稱 */}
                    <div className="flex-1 min-w-[120px]">
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => handlePrizeChange(p.id, 'name', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/15 text-sm text-stone-100 focus:outline-none focus:border-amber-400 font-bold"
                        placeholder="奖项名称"
                      />
                    </div>

                    {/* 獎品內容 */}
                    <div className="flex-1 min-w-[140px]">
                      <input
                        type="text"
                        value={p.item || ''}
                        onChange={(e) => handlePrizeChange(p.id, 'item', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/15 text-sm text-amber-100/90 focus:outline-none focus:border-amber-400"
                        placeholder="奖品描述（如ysl口红）"
                      />
                    </div>

                    {/* 抽取名額人數 */}
                    <div className="flex items-center gap-1.5 w-28">
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={p.quota}
                        onChange={(e) => handlePrizeChange(p.id, 'quota', e.target.value)}
                        className="w-16 px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-sm text-stone-100 text-center font-mono font-bold focus:outline-none focus:border-amber-400"
                      />
                      <span className="text-xs text-stone-400">人</span>
                    </div>

                    {/* 刪除自定義按鈕 */}
                    {localPrizes.length > 1 && (
                      <button
                        onClick={() => handleDeletePrize(p.id)}
                        className="p-2 rounded-lg hover:bg-rose-500/20 text-stone-400 hover:text-rose-400 transition-all"
                        title="删除该奖项"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* 儲存設定按鈕 */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSavePrizes}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-bold text-sm shadow-md flex items-center gap-2 transition-all active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>保存设置</span>
                </button>
              </div>
            </div>
          )}

          {/* 人員名單 Tab */}
          {activeTab === 'candidates' && (
            <div className="space-y-4">
              {/* 名單統計卡 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                  <div className="text-xs text-stone-400">总候选人</div>
                  <div className="text-2xl font-bold text-amber-300 font-mono mt-0.5">
                    {candidates.length}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                  <div className="text-xs text-stone-400">已中奖人数</div>
                  <div className="text-2xl font-bold text-rose-400 font-mono mt-0.5">
                    {winnersCount}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                  <div className="text-xs text-stone-400">奖池剩余</div>
                  <div className="text-2xl font-bold text-emerald-400 font-mono mt-0.5">
                    {candidates.length - winnersCount}
                  </div>
                </div>
              </div>

              {/* 上傳 Excel / CSV 文件 */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-amber-500/30 flex flex-col items-center justify-center text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-amber-400 mb-2" />
                <div className="text-sm font-semibold text-stone-200">
                  导入 Excel 人员名单 (.xlsx / .csv)
                </div>
                <div className="text-xs text-stone-400 mt-1 mb-3">
                  支持表头字段：工号、姓名、部门
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-xs font-semibold transition-all"
                >
                  选择文件导入
                </button>
              </div>

              {/* 批量貼上輸入 */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  快速文本粘贴添加（每行一人，格式如：F1007748 罗奇）
                </label>
                <textarea
                  rows="3"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="F1007748 罗奇&#10;F1008312 鲁李斌"
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-stone-100 font-mono focus:outline-none focus:border-amber-400 resize-none"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={handleBatchPaste}
                    className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-amber-200 transition-all"
                  >
                    添加至奖池
                  </button>
                </div>
              </div>

              {/* 當前名單即時明細預覽（讓用戶一目了然上傳的姓名與工號是否正確） */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                      当前奖池人员明细 ({candidates.length} 人)
                    </span>
                  </div>
                  {candidates.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm('确定要清空当前所有候选人吗？')) {
                          onUpdateCandidates([]);
                        }
                      }}
                      className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      清空全部人员
                    </button>
                  )}
                </div>

                {candidates.length === 0 ? (
                  <div className="text-center py-6 text-xs text-stone-500">
                    当前暂无候选人，请选择上方 Excel 文件导入或粘贴添加
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto custom-scrollbar border border-white/10 rounded-xl divide-y divide-white/5 bg-black/40">
                    <div className="grid grid-cols-12 px-3 py-2 text-[11px] font-bold text-amber-300/90 bg-white/[0.04] sticky top-0 backdrop-blur z-10">
                      <span className="col-span-2">序号</span>
                      <span className="col-span-4">工号</span>
                      <span className="col-span-4">姓名</span>
                      <span className="col-span-2 text-right">部门</span>
                    </div>
                    {candidates.map((c, idx) => (
                      <div key={c.id || idx} className="grid grid-cols-12 px-3 py-1.5 text-xs text-stone-200 hover:bg-white/[0.04] transition-colors items-center">
                        <span className="col-span-2 font-mono text-stone-500 text-[11px]">{idx + 1}</span>
                        <span className="col-span-4 font-mono font-medium text-amber-100/90 truncate pr-2">{c.id}</span>
                        <span className="col-span-4 font-bold text-stone-100 truncate pr-2">{c.name}</span>
                        <span className="col-span-2 text-right text-stone-400 text-[11px] truncate">{c.department || '员工'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 重置控制區 */}
              <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-rose-300">
                    清空已中奖名单（保留人员，重新开奖）
                  </div>
                  <div className="text-[11px] text-stone-400">
                    所有人员重新返回奖池，中奖记录重置
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm('确定要清空所有中奖记录，重新开奖吗？')) {
                      onResetWinners();
                      alert('已重置中奖记录！');
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-rose-200 text-xs font-medium transition-all"
                >
                  清空中奖
                </button>
              </div>

              {/* 恢復預設 32 人名單 */}
              <div className="p-4 rounded-2xl bg-stone-900/40 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-stone-300">
                    恢复为《上半年生日名单.xlsx》预设 32 位员工
                  </div>
                  <div className="text-[11px] text-stone-400">
                    重新加载原始名单与预设四等~一等奖名额
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm('确定要恢复为预设名单与奖项吗？')) {
                      onResetAllToDefault();
                      alert('已恢复为初始数据！');
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-stone-300 text-xs font-medium transition-all flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>恢复初始</span>
                </button>
              </div>
            </div>
          )}

          {/* 音樂與音效設定 Tab */}
          {activeTab === 'audio' && (
            <div className="space-y-5">
              {/* 1. 音量與總開關面板 */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-amber-500/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Music className="w-5 h-5 text-amber-400" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-100">背景音乐 (BGM) 开关</h4>
                      <p className="text-[11px] text-stone-400">控制抽奖系统平时的常态背景音乐播放</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const next = !bgmEnabled;
                      setBgmEnabled(next);
                      bgmManager.setBgmEnabled(next);
                      if (onToggleBgm) onToggleBgm();
                    }}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                      bgmEnabled
                        ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                        : 'bg-white/10 text-stone-400 hover:bg-white/20'
                    }`}
                  >
                    {bgmEnabled ? '已开启' : '已关闭'}
                  </button>
                </div>

                {/* 音量滑塊 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                  {/* BGM 音量 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-300 font-medium flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                        背景音乐音量
                      </span>
                      <span className="font-mono text-amber-300 font-bold">{Math.round(bgmVol * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={bgmVol}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setBgmVol(val);
                        bgmManager.setBgmVolume(val);
                      }}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>

                  {/* 中獎音效音量 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-300 font-medium flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        中奖庆典音量
                      </span>
                      <span className="font-mono text-amber-300 font-bold">{Math.round(sfxVol * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={sfxVol}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setSfxVol(val);
                        bgmManager.setSfxVolume(val);
                      }}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* 2. 三級音樂即時試聽區 */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-amber-200 tracking-wider uppercase flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>三级音乐体验与即时试听</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 預設 BGM */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-amber-500/20 flex flex-col justify-between hover:border-amber-400/40 transition-all">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-lg">🎵</span>
                        <div className="text-sm font-bold text-amber-100">默认背景音乐</div>
                      </div>
                      <p className="text-[11px] text-stone-400 leading-relaxed mb-3">
                        平时状态循环播放。欢快喜庆的年会派对旋律与轻快节拍。
                      </p>
                    </div>
                    <button
                      onClick={() => handleTogglePreview('default')}
                      className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        previewState === 'default'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-400/30'
                      }`}
                    >
                      {previewState === 'default' ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>停止试听</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>试听默认音乐</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 常規中獎音樂 */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-amber-500/20 flex flex-col justify-between hover:border-amber-400/40 transition-all">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-lg">🏆</span>
                        <div className="text-sm font-bold text-amber-100">常规中奖音乐</div>
                      </div>
                      <p className="text-[11px] text-stone-400 leading-relaxed mb-3">
                        二/三/四等与加码奖专属。胜利欢腾的和弦与明快庆典节奏。
                      </p>
                    </div>
                    <button
                      onClick={() => handleTogglePreview('regular_win')}
                      className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        previewState === 'regular_win'
                          ? 'bg-amber-400 text-stone-950 font-extrabold animate-pulse'
                          : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-400/30'
                      }`}
                    >
                      {previewState === 'regular_win' ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5 animate-spin" />
                          <span>播放中...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>试听常规中奖</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 一等獎終極大獎音樂 */}
                  <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-400/40 flex flex-col justify-between hover:border-amber-300 transition-all shadow-lg shadow-amber-500/5">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-lg">👑</span>
                        <div className="text-sm font-bold text-amber-200">一等奖专属大奖</div>
                      </div>
                      <p className="text-[11px] text-stone-400 leading-relaxed mb-3">
                        终极大奖专享！气势磅礴的皇家交响号角、高音琶音与交响大调。
                      </p>
                    </div>
                    <button
                      onClick={() => handleTogglePreview('grand_win')}
                      className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        previewState === 'grand_win'
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-950 font-extrabold animate-pulse shadow-md shadow-amber-400/30'
                          : 'bg-amber-500/30 text-amber-200 hover:bg-amber-500/40 border border-amber-400/50'
                      }`}
                    >
                      {previewState === 'grand_win' ? (
                        <>
                          <Crown className="w-3.5 h-3.5 animate-bounce" />
                          <span>超级大奖播放中...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>试听一等奖专属</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. 自定義背景音樂上傳 */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-amber-500/30 space-y-3">
                <input
                  type="file"
                  ref={audioFileInputRef}
                  onChange={handleAudioUpload}
                  accept="audio/*,.mp3,.wav,.ogg,.aac,.m4a"
                  className="hidden"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Upload className="w-5 h-5 text-amber-400" />
                    <div>
                      <div className="text-xs font-bold text-stone-200">上传自定义背景音乐</div>
                      <div className="text-[11px] text-stone-400">支持 .mp3 / .wav / .ogg / .aac 等常见音频格式</div>
                    </div>
                  </div>
                  <button
                    onClick={() => audioFileInputRef.current?.click()}
                    className="px-4 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-xs font-semibold transition-all"
                  >
                    选择音频文件
                  </button>
                </div>

                {customAudioName ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <Music className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-xs text-amber-100 font-medium truncate">{customAudioName}</span>
                    </div>
                    <button
                      onClick={handleClearAudio}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] shrink-0 transition-all"
                    >
                      恢复默认音乐
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-stone-500">
                    💡 提示：当前使用系统内置欢庆 BGM。上传后将作为默认背景音乐循环播放；中奖时依然会自动智能切换为专属中奖庆典音乐！
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
