/* ============================================
   AICA - Trợ Lý Sáng Tạo | Application Logic
   ============================================ */

(function () {
  'use strict';

  // =============================================
  // CONFIG & STATE
  // =============================================
  const CONFIG = {
    API_URL: '/api/generate', // Gọi tới Proxy Node.js của chúng ta thay vì trực tiếp tới OpenAI
    MODEL: 'gpt-4o-mini',
    MAX_TOKENS: 4096,
    TEMPERATURE: 0.85,
  };

  const state = {
    apiKey: '',
    activeTab: 'tab-write',
    advancedMode: 'ai', // 'ai' | 'random' | 'manual'
    isGenerating: false,
    lastFormData: null,
    lastAction: null,
    outputVersions: [],
    activeVersion: 0,
  };

  // =============================================
  // DOM REFERENCES
  // =============================================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    // API Key Bar removed from UI for security

    tabs: $$('.tab'),
    tabContents: $$('.tab-content'),
    advancedToggle: $('#advancedToggle'),
    advancedSection: $('#advancedSection'),
    manualModeContent: $('#manualModeContent'),
    modeBtns: $$('.mode-btn'),
    btnGenerate: $('#btnGenerate'),
    btnReview: $('#btnReview'),
    btnHook: $('#btnHook'),
    btnCopy: $('#btnCopy'),
    btnRegenerate: $('#btnRegenerate'),
    outputArea: $('#outputArea'),
    outputContent: $('#outputContent'),
    versionTabs: $('#versionTabs'),
    toast: $('#toast'),
    sliderSpoken: $('#sliderSpoken'),
    sliderSpokenValue: $('#sliderSpokenValue'),
    sliderQuantitative: $('#sliderQuantitative'),
    sliderQuantitativeValue: $('#sliderQuantitativeValue'),
  };

  // =============================================
  // INIT
  // =============================================
  function init() {
    // loadApiKey(); // No longer needed as keys are handled server-side
    setupTabs();
    setupPills();
    setupAdvancedToggle();
    setupModeSelector();
    setupSliders();
    setupActionButtons();
    setupOutputActions();
    setupSuggestButtons();
    setupCustomInputToggles();
  }

  // =============================================
  // API KEY
  // =============================================
  function loadApiKey() {
    const saved = localStorage.getItem('aica_api_key');
    if (saved) {
      state.apiKey = saved;
      dom.apiKeyInput.value = saved;
      setApiKeyStatus(true);
    }
    dom.apiKeySaveBtn.addEventListener('click', () => {
      const key = dom.apiKeyInput.value.trim();
      if (key && key.startsWith('sk-')) {
        state.apiKey = key;
        localStorage.setItem('aica_api_key', key);
        setApiKeyStatus(true);
        showToast('Đã lưu API Key thành công!', 'success');
      } else {
        showToast('API Key không hợp lệ. Key phải bắt đầu bằng "sk-"', 'error');
      }
    });
  }

  function setApiKeyStatus(connected) {
    if (connected) {
      dom.apiKeyStatus.textContent = '✅ Đã kết nối';
      dom.apiKeyStatus.className = 'api-key-bar__status connected';
    } else {
      dom.apiKeyStatus.textContent = 'Chưa kết nối';
      dom.apiKeyStatus.className = 'api-key-bar__status disconnected';
    }
  }

  // =============================================
  // TAB SWITCHING
  // =============================================
  function setupTabs() {
    dom.tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetId = tab.dataset.tab;
        state.activeTab = targetId;

        // Update tab buttons
        dom.tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        // Update tab content
        dom.tabContents.forEach((tc) => tc.classList.remove('active'));
        $(`#${targetId}`).classList.add('active');

        // Hide output on tab switch
        dom.outputArea.classList.add('hidden');
      });
    });
  }

  // =============================================
  // PILL BUTTONS
  // =============================================
  function setupPills() {
    document.addEventListener('click', (e) => {
      const pill = e.target.closest('.pill');
      if (!pill) return;

      const container = pill.closest('.pills');
      const selectMode = container.dataset.select; // 'single' or 'multi'

      if (selectMode === 'single') {
        container.querySelectorAll('.pill').forEach((p) => p.classList.remove('selected'));
        pill.classList.add('selected');
      } else {
        pill.classList.toggle('selected');
      }

      // Clear error state on parent field-group
      const fieldGroup = pill.closest('.field-group');
      if (fieldGroup) fieldGroup.classList.remove('error');
    });
  }

  // =============================================
  // ADVANCED TOGGLE
  // =============================================
  function setupAdvancedToggle() {
    dom.advancedToggle.addEventListener('click', () => {
      const isOpen = dom.advancedSection.classList.toggle('open');
      dom.advancedToggle.classList.toggle('open', isOpen);
      dom.advancedToggle.innerHTML = isOpen
        ? '<span class="advanced-toggle__arrow">▲</span> Ẩn nâng cao'
        : '<span class="advanced-toggle__arrow">▼</span> Thêm tuỳ chọn nâng cao (công thức, văn phong, CTA...)';
    });
  }

  // =============================================
  // MODE SELECTOR (AI gợi ý / Ngẫu nhiên / Tự chọn)
  // =============================================
  function setupModeSelector() {
    dom.modeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        dom.modeBtns.forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.advancedMode = btn.dataset.mode;

        if (btn.dataset.mode === 'manual') {
          dom.manualModeContent.classList.remove('hidden');
        } else {
          dom.manualModeContent.classList.add('hidden');
        }
      });
    });
  }

  // =============================================
  // SLIDERS
  // =============================================
  function setupSliders() {
    function updateSlider(slider, valueEl) {
      const val = slider.value;
      valueEl.textContent = `${val}%`;
      slider.style.background = `linear-gradient(90deg, var(--primary) ${val}%, #e5e7eb ${val}%)`;
    }

    if (dom.sliderSpoken) {
      updateSlider(dom.sliderSpoken, dom.sliderSpokenValue);
      dom.sliderSpoken.addEventListener('input', () =>
        updateSlider(dom.sliderSpoken, dom.sliderSpokenValue)
      );
    }

    if (dom.sliderQuantitative) {
      updateSlider(dom.sliderQuantitative, dom.sliderQuantitativeValue);
      dom.sliderQuantitative.addEventListener('input', () =>
        updateSlider(dom.sliderQuantitative, dom.sliderQuantitativeValue)
      );
    }
  }

  // =============================================
  // CUSTOM INPUT TOGGLES
  // =============================================
  function setupCustomInputToggles() {
    // When user clicks a pill with value like "custom-xxx", show corresponding input
    document.addEventListener('click', (e) => {
      const pill = e.target.closest('.pill');
      if (!pill) return;

      const container = pill.closest('.pills');
      const name = container?.dataset.name;

      // Length type
      if (name === 'length-type') {
        const customInput = $('#customLengthInput');
        if (pill.dataset.value === 'custom-length' && pill.classList.contains('selected')) {
          customInput.classList.remove('hidden');
        } else {
          customInput.classList.add('hidden');
        }
      }

      // Version count
      if (name === 'versions') {
        const customInput = $('#customVersionInput');
        if (pill.dataset.value === 'custom-version' && pill.classList.contains('selected')) {
          customInput.classList.remove('hidden');
        } else {
          customInput.classList.add('hidden');
        }
      }

      // Hook count
      if (name === 'hook-count') {
        const customInput = $('#customHookCountInput');
        if (pill.dataset.value === 'custom-hook-count' && pill.classList.contains('selected')) {
          customInput.classList.remove('hidden');
        } else {
          customInput.classList.add('hidden');
        }
      }
    });
  }

  // =============================================
  // SUGGEST BUTTONS (💡 Gợi ý)
  // =============================================
  function setupSuggestButtons() {
    const suggestions = {
      customer:
        'Minh Anh, 24 tuổi, ở TP.HCM, vừa được thăng chức lên Trưởng nhóm Marketing. Minh Anh là người hướng nội, rất giỏi về chuyên môn và lên kế hoạch, nhưng lại cực kỳ sợ hãi khi phải nói trước đám đông. Mỗi lần họp, cô thường để cho người khác trình bày ý tưởng của mình. Cô khao khát chứng tỏ năng lực ở vị trí mới nhưng nỗi sợ thuyết trình đang là rào cản lớn nhất.',
      insight:
        'Minh Anh không chỉ sợ thuyết trình. Cô ấy sợ rằng sự áp ứng, thiếu tự tin của mình sẽ khiến đồng nghiệp và cấp trên đánh giá sai về năng lực chuyên môn thực sự của cô. Nỗi sợ lớn nhất của cô là bị coi thường, là hình ảnh một chuyên gia giỏi giang mà cô nỗ lực xây dựng sẽ sụp đổ chỉ vì vài phút trình bày kém cỏi.',
      message: 'Tự tin nói là kỹ năng, không phải tính cách bẩm sinh. Ai cũng có thể học được.',
      'hook-product': 'Kem chống nắng SPF50+ chiết xuất tự nhiên, dành cho da nhạy cảm',
      'hook-audience': 'Phụ nữ 25-35 tuổi, quan tâm đến chăm sóc da, sống tại thành phố lớn',
    };

    $$('.btn-suggest').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.suggest;
        const suggestion = suggestions[key];
        if (!suggestion) return;

        // Find the nearest input/textarea sibling
        const fieldGroup = btn.closest('.field-group') || btn.closest('div');
        const input =
          fieldGroup.querySelector('textarea') || fieldGroup.querySelector('input[type="text"]');
        if (input) {
          input.value = suggestion;
          input.focus();
          // Flash animation
          input.style.transition = 'background 0.3s';
          input.style.background = '#dcfce7';
          setTimeout(() => (input.style.background = ''), 600);
        }
      });
    });
  }

  // =============================================
  // FORM DATA COLLECTION
  // =============================================
  function getSelectedPills(name) {
    const container = document.querySelector(`.pills[data-name="${name}"]`);
    if (!container) return [];
    return Array.from(container.querySelectorAll('.pill.selected')).map(
      (p) => p.textContent.trim()
    );
  }

  function getSelectedPillValues(name) {
    const container = document.querySelector(`.pills[data-name="${name}"]`);
    if (!container) return [];
    return Array.from(container.querySelectorAll('.pill.selected')).map(
      (p) => p.dataset.value
    );
  }

  function collectWriteFormData() {
    const purpose = getSelectedPills('purpose')[0] || '';
    const brand = $('#brandInput').value.trim();
    const channels = getSelectedPills('channel');
    const customer = $('#customerInput').value.trim();
    const insight = $('#insightInput').value.trim();
    const goal = getSelectedPills('goal')[0] || '';
    const outputType = getSelectedPills('output-type')[0] || '';
    const format = getSelectedPills('format')[0] || 'Text trơn';
    const lengthType = getSelectedPills('length-type')[0] || '';
    const lengthValue = $('#lengthValue')?.value.trim() || '';
    const additionalPrompt = $('#additionalPrompt').value.trim();

    // Versions
    let versions = 1;
    const versionPills = getSelectedPillValues('versions');
    if (versionPills[0] === 'custom-version') {
      versions = parseInt($('#versionValue')?.value) || 1;
    } else {
      versions = parseInt(versionPills[0]) || 1;
    }
    versions = Math.min(Math.max(versions, 1), 10);

    // Advanced
    let advancedData = {};
    if (dom.advancedSection.classList.contains('open')) {
      advancedData.mode = state.advancedMode;
      if (state.advancedMode === 'manual') {
        advancedData.funnelCold = getSelectedPills('funnel-cold');
        advancedData.funnelWarm = getSelectedPills('funnel-warm');
        advancedData.funnelHot = getSelectedPills('funnel-hot');
        advancedData.message = $('#messageInput')?.value.trim() || '';
        advancedData.tone = getSelectedPills('tone');
        advancedData.spokenRatio = dom.sliderSpoken?.value || 50;
        advancedData.quantitativeRatio = dom.sliderQuantitative?.value || 50;
        advancedData.evidence = $('#evidenceInput')?.value.trim() || '';
      }
    }

    return {
      purpose,
      brand,
      channels,
      customer,
      insight,
      goal,
      outputType,
      format,
      lengthType,
      lengthValue,
      versions,
      additionalPrompt,
      advanced: advancedData,
    };
  }

  function collectReviewFormData() {
    return {
      content: $('#reviewContentInput').value.trim(),
      improvements: getSelectedPills('improve-type'),
      note: $('#reviewNoteInput').value.trim(),
    };
  }

  function collectHookFormData() {
    const product = $('#hookProductInput').value.trim();
    const ages = getSelectedPills('hook-age');
    const audience = $('#hookAudienceInput').value.trim();
    const goal = $('#hookGoalInput').value.trim();

    let count = 5;
    const countPills = getSelectedPillValues('hook-count');
    if (countPills[0] === 'custom-hook-count') {
      count = parseInt($('#hookCountValue')?.value) || 5;
    } else {
      count = parseInt(countPills[0]) || 5;
    }
    count = Math.min(Math.max(count, 1), 50);

    return { product, ages, audience, goal, count };
  }

  // =============================================
  // VALIDATION
  // =============================================
  function validateWriteForm() {
    let valid = true;
    const requiredFields = $$('#tab-write .field-group[data-required="true"]');

    requiredFields.forEach((fg) => {
      fg.classList.remove('error');
      const field = fg.dataset.field;

      if (field === 'purpose' || field === 'channel' || field === 'goal' || field === 'output-type') {
        const pills = fg.querySelector('.pills');
        const selected = pills?.querySelectorAll('.pill.selected');
        if (!selected || selected.length === 0) {
          fg.classList.add('error');
          valid = false;
        }
      } else if (field === 'brand') {
        if (!$('#brandInput').value.trim()) {
          fg.classList.add('error');
          valid = false;
        }
      } else if (field === 'customer') {
        if (!$('#customerInput').value.trim()) {
          fg.classList.add('error');
          valid = false;
        }
      }
    });

    if (!valid) {
      const firstError = document.querySelector('.field-group.error');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return valid;
  }

  function validateReviewForm() {
    const fg = document.querySelector('#tab-review .field-group[data-required="true"]');
    fg.classList.remove('error');
    if (!$('#reviewContentInput').value.trim()) {
      fg.classList.add('error');
      fg.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  }

  function validateHookForm() {
    const fg = document.querySelector('#tab-hook .field-group[data-required="true"]');
    fg.classList.remove('error');
    if (!$('#hookProductInput').value.trim()) {
      fg.classList.add('error');
      fg.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  }

  // Clear error on input
  document.addEventListener('input', (e) => {
    const fg = e.target.closest('.field-group');
    if (fg) fg.classList.remove('error');
  });

  // =============================================
  // PROMPT BUILDERS
  // =============================================
  function buildWritePrompt(data) {
    let prompt = `Bạn là một chuyên gia content marketing hàng đầu Việt Nam với hơn 10 năm kinh nghiệm. Bạn sáng tạo, nắm bắt xu hướng, và hiểu sâu tâm lý người đọc trên mạng xã hội Việt Nam.

=== NHIỆM VỤ ===
Tạo ${data.outputType} cho kênh ${data.channels.join(', ')}.

=== THÔNG TIN ĐẦU VÀO ===
- Vai trò / Mục đích: ${data.purpose}
- Thương hiệu / Sản phẩm: ${data.brand}
- Khách hàng mục tiêu: ${data.customer}`;

    if (data.insight) {
      prompt += `\n- Insight / Nỗi đau: ${data.insight}`;
    }

    prompt += `\n- Mục tiêu kinh doanh: ${data.goal}`;
    prompt += `\n- Định dạng: ${data.format}`;

    if (data.lengthType && data.lengthValue) {
      prompt += `\n- Độ dài: ${data.lengthValue} (${data.lengthType})`;
    } else if (data.lengthType) {
      prompt += `\n- Độ dài: phù hợp ${data.lengthType}`;
    }

    // Advanced options
    if (data.advanced && data.advanced.mode) {
      if (data.advanced.mode === 'ai') {
        prompt += `\n\n=== CHẾ ĐỘ NÂNG CAO: AI GỢI Ý ===
Hãy tự chọn tuyến nội dung, công thức, và văn phong phù hợp nhất dựa trên thông tin đầu vào.`;
      } else if (data.advanced.mode === 'random') {
        prompt += `\n\n=== CHẾ ĐỘ NÂNG CAO: NGẪU NHIÊN ===
Hãy sáng tạo tự do, thử các góc nhìn bất ngờ và độc đáo nhất.`;
      } else if (data.advanced.mode === 'manual') {
        prompt += `\n\n=== CHẾ ĐỘ NÂNG CAO: TÙY CHỌN ===`;

        if (data.advanced.funnelCold?.length) {
          prompt += `\n- Phễu lạnh: ${data.advanced.funnelCold.join(', ')}`;
        }
        if (data.advanced.funnelWarm?.length) {
          prompt += `\n- Phễu ấm: ${data.advanced.funnelWarm.join(', ')}`;
        }
        if (data.advanced.funnelHot?.length) {
          prompt += `\n- Phễu nóng: ${data.advanced.funnelHot.join(', ')}`;
        }
        if (data.advanced.message) {
          prompt += `\n- Thông điệp chính: ${data.advanced.message}`;
        }
        if (data.advanced.tone?.length) {
          prompt += `\n- Văn phong: ${data.advanced.tone.join(', ')}`;
        }
        prompt += `\n- Cân bằng: ${data.advanced.spokenRatio}% văn nói, ${100 - data.advanced.spokenRatio}% văn viết`;
        prompt += `\n- Cân bằng: ${data.advanced.quantitativeRatio}% định tính, ${100 - data.advanced.quantitativeRatio}% định lượng`;
        if (data.advanced.evidence) {
          prompt += `\n- Số liệu / bằng chứng: ${data.advanced.evidence}`;
        }
      }
    }

    if (data.additionalPrompt) {
      prompt += `\n\n=== YÊU CẦU ĐẶC BIỆT ===
${data.additionalPrompt}`;
    }

    prompt += `\n\n=== HƯỚNG DẪN OUTPUT ===
- Tạo ${data.versions} phiên bản khác nhau, MỖI phiên bản phải có góc nhìn/cách tiếp cận KHÁC BIỆT.
- Ngăn cách các phiên bản bởi dấu "---".
- Viết đầy đủ, chi tiết, sẵn sàng đăng ngay.
- Nội dung phải tự nhiên, đúng giọng người Việt, không máy móc.`;

    return prompt;
  }

  function buildReviewPrompt(data) {
    return `Bạn là chuyên gia biên tập nội dung marketing Việt Nam hàng đầu.

=== NHIỆM VỤ ===
Đánh giá, phân tích điểm mạnh/yếu, và viết lại bản cải thiện cho nội dung dưới đây.

=== NỘI DUNG GỐC ===
${data.content}

=== YÊU CẦU CẢI THIỆN ===
${data.improvements.join(', ')}

${data.note ? `=== GHI CHÚ THÊM ===\n${data.note}` : ''}

=== HƯỚNG DẪN OUTPUT ===
1. **📊 Đánh giá nhanh**: Chấm điểm nội dung gốc (1-10), liệt kê 3 điểm mạnh và 3 điểm cần cải thiện.
2. **✨ Bản viết lại**: Viết lại hoàn chỉnh nội dung đã được cải thiện theo yêu cầu.
3. **📝 Ghi chú thay đổi**: Giải thích ngắn gọn những gì đã thay đổi và tại sao.`;
  }

  function buildHookPrompt(data) {
    return `Bạn là chuyên gia sáng tạo content marketing Việt Nam, chuyên viết hook và headline viral.

=== NHIỆM VỤ ===
Đề xuất ${data.count} hook/ý tưởng content cho sản phẩm/dịch vụ dưới đây.

=== THÔNG TIN ===
- Sản phẩm / Dịch vụ: ${data.product}
- Đối tượng: ${data.ages.join(', ')}${data.audience ? ` — ${data.audience}` : ''}
${data.goal ? `- Mục tiêu: ${data.goal}` : ''}

=== HƯỚNG DẪN ===
Với mỗi ý tưởng, trình bày theo format:
**[Số thứ tự]. [Hook/Tiêu đề gợi ý]**
- Loại nội dung: (VD: Video TikTok, Bài Facebook, Carousel IG...)
- Ý tưởng triển khai: Mô tả ngắn 2-3 dòng cách triển khai
- Phễu: Lạnh / Ấm / Nóng

Các hook phải ĐA DẠNG về phong cách: có cái gây tò mò, có cái gây tranh luận, có cái kể chuyện, có cái dùng số liệu.`;
  }

  // =============================================
  // AI API CALL (with Demo fallback)
  // =============================================
  async function callAI(systemPrompt, onChunk) {
    // Try real API first, fallback to demo mode on error
    try {
      return await callRealAPI(systemPrompt, onChunk);
    } catch (err) {
      console.warn('API call failed, switching to Demo mode:', err.message);
      showToast('⚠️ API không khả dụng — chuyển sang chế độ Demo', 'error');
      return await callDemoAPI(systemPrompt, onChunk);
    }
  }

  async function callRealAPI(systemPrompt, onChunk) {
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemPrompt: systemPrompt,
        prompt: 'Hãy thực hiện nhiệm vụ được giao. Viết bằng tiếng Việt, chất lượng cao.',
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error || `API Error: ${response.status}`);
    }

    // --- ĐỌC LUỒNG DỮ LIỆU (STREAMING) ---
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Gói tin OpenAI Stream có dạng "data: {...}\n\n"
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Giữ lại dòng cuối cùng chưa hoàn chỉnh

      for (const line of lines) {
        const message = line.replace(/^data: /, '').trim();
        if (message === '[DONE]') break;
        if (!message) continue;

        try {
          const parsed = JSON.parse(message);
          const chunk = parsed.choices[0]?.delta?.content || '';
          if (chunk) {
            fullText += chunk;
            // Gọi callback để UI cập nhật ngay lập tức (không cần typewriter giả lập)
            onChunk(fullText);
          }
        } catch (e) {
          // Bỏ qua lỗi parse nếu dòng không phải JSON hợp lệ
        }
      }
    }

    return fullText;
  }


  // =============================================
  // DEMO MODE — Mock AI Response with typewriter
  // =============================================
  function getDemoResponse() {
    if (state.lastAction === 'write') {
      return `## 📝 Phiên bản 1: Góc nhìn "Nỗi đau thật"

**Bạn có đang mất khách mà không biết tại sao?**

Mỗi ngày, hàng trăm tin nhắn đổ về fanpage của bạn lúc 2h sáng. Bạn không thể trả lời hết. Khách hàng chờ 5 phút không thấy reply — họ chuyển sang đối thủ.

Đó không phải lỗi của bạn. Đó là lỗi của cách vận hành.

**F-Manager** ra đời để giải quyết đúng vấn đề này:
- ✅ Tự động trả lời tin nhắn 24/7 — không bỏ sót khách nào
- ✅ Ẩn bình luận chứa số điện thoại — chặn cướp đơn tận gốc
- ✅ Chốt đơn tự động theo kịch bản có sẵn — giảm 90% thời gian trực page

*"Trước khi dùng F-Manager, mình phải thuê 2 nhân viên trực page. Giờ chỉ cần 1 người kiểm tra mỗi sáng."* — Chị Lan, chủ shop mỹ phẩm online

👉 Dùng thử miễn phí 7 ngày. Link trong bình luận đầu tiên.

---

## 📝 Phiên bản 2: Góc nhìn "Câu chuyện founder"

**Tôi từng mất 50 đơn hàng trong 1 đêm vì... ngủ quên.**

Không phải vì sản phẩm kém. Không phải vì giá cao. Mà vì tôi không reply tin nhắn đủ nhanh.

Lúc đó tôi hiểu: Bán hàng online không phải cuộc chiến về sản phẩm. Nó là cuộc chiến về **tốc độ phản hồi**.

Và đó là lý do F-Manager được tạo ra.

Một phần mềm đơn giản nhưng thay đổi hoàn toàn cách bạn vận hành fanpage:

**Trước F-Manager:**
- 😩 Thức đêm trực page
- 😱 Bình luận SĐT bị đối thủ cướp đơn
- 😤 Khách inbox lúc 1h sáng, sáng hôm sau reply thì họ đã mua chỗ khác

**Sau F-Manager:**
- 😴 Ngủ ngon, hệ thống tự chạy
- 🛡️ SĐT trong comment tự động ẩn
- 🤖 Bot chốt đơn 24/7 theo kịch bản bạn thiết lập

Kết quả? **Giảm 90% thời gian trực page. Tăng 40% tỷ lệ chốt đơn.**

Đừng để giấc ngủ của bạn quyết định doanh thu.
👉 Trải nghiệm miễn phí tại link bio.`;
    }

    if (state.lastAction === 'review') {
      return `## 📊 Đánh giá nhanh

**Điểm tổng: 6/10**

**3 điểm mạnh:**
1. Thông tin sản phẩm rõ ràng, đầy đủ tính năng
2. Có số liệu cụ thể ("giảm 90%") tạo độ tin cậy
3. Cấu trúc bài viết logic, dễ theo dõi

**3 điểm cần cải thiện:**
1. Hook mở đầu quá yếu — không tạo được cảm xúc hoặc tò mò
2. Thiếu yếu tố storytelling — đọc như brochure sản phẩm thay vì bài content
3. CTA (lời kêu gọi hành động) quá chung chung, không tạo khẩn cấp

---

## ✨ Bản viết lại

**Lúc 2h sáng, bạn đang ở đâu?**

Nếu câu trả lời là "đang trả lời tin nhắn khách hàng trên fanpage" — thì đây là bài viết dành cho bạn.

Mình từng giống bạn. Cứ nửa đêm lại giật mình vì tiếng "ting" trên Messenger. Không reply? Sáng mai khách đã mua chỗ khác. Reply? Thì sáng mai mình như zombie.

Cho đến khi mình tìm thấy F-Manager.

Phần mềm này làm đúng 3 thứ — nhưng 3 thứ đó thay đổi hoàn toàn cuộc chơi:

→ **Auto Reply 24/7**: Khách nhắn lúc nào, bot reply lúc đấy. Theo đúng kịch bản mình thiết lập sẵn.

→ **Ẩn SĐT tự động**: Ai comment số điện thoại? Ẩn ngay. Không cho đối thủ cơ hội chôm khách.

→ **Chốt đơn smart**: Bot tư vấn → chốt đơn → ghi nhận thông tin. Không cần người trực.

Kết quả sau 1 tháng dùng: Giảm 90% thời gian trực page, tăng 35% tỷ lệ chuyển đổi.

Mình đã ngủ ngon lại. Doanh thu vẫn tăng.

👉 Dùng thử miễn phí 7 ngày — link ở comment đầu tiên.

---

## 📝 Ghi chú thay đổi

1. **Hook mới**: Chuyển từ giới thiệu sản phẩm trực tiếp sang câu hỏi gây đồng cảm
2. **Thêm storytelling**: Kể từ góc nhìn người dùng thật thay vì liệt kê tính năng
3. **CTA mạnh hơn**: Thêm yếu tố "miễn phí 7 ngày" tạo động lực hành động
4. **Cấu trúc**: Chuyển từ bullet dài sang format "→" dễ scan hơn trên mobile`;
    }

    if (state.lastAction === 'hook') {
      return `**1. "90% chủ shop online đang mắc sai lầm này mỗi đêm"**
- Loại nội dung: Bài Facebook (text post)
- Ý tưởng triển khai: Mở bằng thống kê gây sốc về việc chủ shop thức đêm trực page. Dẫn dắt đến giải pháp tự động hóa. Kết bằng câu hỏi tương tác "Bạn có đang trực page lúc 2h sáng không?"
- Phễu: Lạnh

**2. "Trước và Sau khi dùng F-Manager — Câu chuyện của chị Lan"**
- Loại nội dung: Carousel IG (before/after)
- Ý tưởng triển khai: Slide 1: Ảnh mệt mỏi + số liệu "trực page 16h/ngày". Slide 2-4: Từng tính năng giải quyết vấn đề. Slide cuối: Testimonial + kết quả sau 30 ngày.
- Phễu: Ấm

**3. "POV: Đối thủ cướp đơn từ comment của bạn ngay trước mắt"**
- Loại nội dung: Video TikTok/Reels (15-30s)
- Ý tưởng triển khai: Quay màn hình thật showing comment bị cướp → demo tính năng ẩn SĐT tự động → reaction bất ngờ. Dùng trending sound.
- Phễu: Lạnh

**4. "Tôi sa thải 2 nhân viên trực page — và doanh thu tăng 40%"**
- Loại nội dung: Bài Facebook (storytelling dài)
- Ý tưởng triển khai: Kể câu chuyện gây tranh cãi: không phải sa thải vì ghét, mà vì bot làm tốt hơn. Đóng vai founder chia sẻ bài học kinh doanh. Comment sẽ cháy vì chủ đề nhạy cảm.
- Phễu: Lạnh (tranh luận)

**5. "Flash Sale 48H: Dùng F-Manager miễn phí 30 ngày, không cần thẻ"**
- Loại nội dung: Story IG + Bài Facebook
- Ý tưởng triển khai: Tạo urgency bằng countdown. Dùng social proof "500+ shop đã đăng ký tuần này". CTA rõ ràng + link trực tiếp. Chạy retarget cho ai đã xem video #3.
- Phễu: Nóng`;
    }

    return 'Đây là nội dung mẫu từ chế độ Demo. Vui lòng nạp credit OpenAI để sử dụng AI thật.';
  }

  async function callDemoAPI(systemPrompt, onChunk) {
    const fullResponse = getDemoResponse();
    let displayed = '';

    // Simulate streaming with typewriter effect
    for (let i = 0; i < fullResponse.length; i++) {
      displayed += fullResponse[i];
      onChunk(displayed);
      // Variable speed: faster for spaces, slower for punctuation
      const char = fullResponse[i];
      const delay = char === '\n' ? 30 : char === '.' || char === '!' || char === '?' ? 40 : char === ' ' ? 8 : 12;
      await new Promise((r) => setTimeout(r, delay));
    }

    return fullResponse;
  }

  // =============================================
  // ACTION BUTTONS
  // =============================================
  function setupActionButtons() {
    // Tab 1: Viết nhanh
    dom.btnGenerate.addEventListener('click', async () => {
      if (state.isGenerating) return;
      if (!validateWriteForm()) return;

      const formData = collectWriteFormData();
      const prompt = buildWritePrompt(formData);
      state.lastFormData = formData;
      state.lastAction = 'write';

      await executeGeneration(dom.btnGenerate, prompt, 'Sản Xuất Nội Dung 🚀', formData.versions);
    });

    // Tab 2: Đánh giá & Viết lại
    dom.btnReview.addEventListener('click', async () => {
      if (state.isGenerating) return;
      if (!validateReviewForm()) return;

      const formData = collectReviewFormData();
      const prompt = buildReviewPrompt(formData);
      state.lastFormData = formData;
      state.lastAction = 'review';

      await executeGeneration(dom.btnReview, prompt, '✨ Cải thiện nội dung', 1);
    });

    // Tab 3: Gợi ý Hook
    dom.btnHook.addEventListener('click', async () => {
      if (state.isGenerating) return;
      if (!validateHookForm()) return;

      const formData = collectHookFormData();
      const prompt = buildHookPrompt(formData);
      state.lastFormData = formData;
      state.lastAction = 'hook';

      await executeGeneration(dom.btnHook, prompt, 'Gợi ý hook / ý tưởng 💡', 1);
    });
  }

  async function executeGeneration(btn, prompt, originalText, versions) {
    state.isGenerating = true;
    btn.disabled = true;
    btn.classList.add('loading');
    btn.innerHTML = `<span class="spinner"></span> Đang tạo nội dung...`;

    // Show output area
    dom.outputArea.classList.remove('hidden');
    dom.outputContent.innerHTML = '<span class="cursor-blink"></span>';
    dom.versionTabs.innerHTML = '';
    state.outputVersions = [];

    // Scroll to output
    setTimeout(() => {
      dom.outputArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);

    try {
      const fullText = await callAI(prompt, (text) => {
        // Streaming update
        dom.outputContent.innerHTML = formatOutput(text) + '<span class="cursor-blink"></span>';
      });

      // Final render without cursor
      if (versions > 1) {
        // Split versions
        state.outputVersions = fullText
          .split('---')
          .map((v) => v.trim())
          .filter((v) => v.length > 0);

        if (state.outputVersions.length > 1) {
          renderVersionTabs();
          dom.outputContent.innerHTML = formatOutput(state.outputVersions[0]);
        } else {
          dom.outputContent.innerHTML = formatOutput(fullText);
        }
      } else {
        state.outputVersions = [fullText];
        dom.outputContent.innerHTML = formatOutput(fullText);
      }

      showToast('Nội dung đã được tạo thành công! ✅', 'success');
    } catch (err) {
      dom.outputContent.innerHTML = `<div style="color:var(--danger);padding:20px;">
        <strong>❌ Lỗi:</strong> ${err.message}
        <br><br>Vui lòng kiểm tra lại API Key hoặc thử lại sau.
      </div>`;
      showToast('Có lỗi xảy ra: ' + err.message, 'error');
    } finally {
      state.isGenerating = false;
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.textContent = originalText;
    }
  }

  // =============================================
  // VERSION TABS
  // =============================================
  function renderVersionTabs() {
    dom.versionTabs.innerHTML = '';
    state.outputVersions.forEach((_, idx) => {
      const tab = document.createElement('button');
      tab.className = `version-tab${idx === 0 ? ' active' : ''}`;
      tab.textContent = `Phiên bản ${idx + 1}`;
      tab.addEventListener('click', () => {
        dom.versionTabs.querySelectorAll('.version-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeVersion = idx;
        dom.outputContent.innerHTML = formatOutput(state.outputVersions[idx]);
      });
      dom.versionTabs.appendChild(tab);
    });
  }

  // =============================================
  // OUTPUT FORMATTING
  // =============================================
  function formatOutput(text) {
    // Basic markdown-like formatting
    let html = text
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Headers
      .replace(/^### (.+)$/gm, '<h4 style="margin:16px 0 8px;color:var(--primary)">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 style="margin:20px 0 10px;color:var(--primary-dark)">$1</h3>')
      .replace(/^# (.+)$/gm, '<h2 style="margin:24px 0 12px;color:var(--primary-dark)">$1</h2>')
      // Line breaks
      .replace(/\n/g, '<br>');

    return html;
  }

  // =============================================
  // OUTPUT ACTIONS
  // =============================================
  function setupOutputActions() {
    // Copy
    dom.btnCopy.addEventListener('click', () => {
      const text = state.outputVersions[state.activeVersion] || dom.outputContent.innerText;
      navigator.clipboard.writeText(text).then(() => {
        dom.btnCopy.classList.add('copied');
        dom.btnCopy.textContent = '✅ Đã copy!';
        showToast('Đã copy nội dung! 📋', 'success');
        setTimeout(() => {
          dom.btnCopy.classList.remove('copied');
          dom.btnCopy.innerHTML = '📋 Copy';
        }, 2000);
      });
    });

    // Regenerate
    dom.btnRegenerate.addEventListener('click', () => {
      if (state.isGenerating) return;

      // Re-trigger the last action
      if (state.lastAction === 'write') {
        dom.btnGenerate.click();
      } else if (state.lastAction === 'review') {
        dom.btnReview.click();
      } else if (state.lastAction === 'hook') {
        dom.btnHook.click();
      }
    });
  }

  // =============================================
  // TOAST NOTIFICATION
  // =============================================
  function showToast(message, type = 'success') {
    dom.toast.textContent = message;
    dom.toast.className = `toast toast--${type} show`;
    setTimeout(() => {
      dom.toast.classList.remove('show');
    }, 3000);
  }

  // =============================================
  // BOOT
  // =============================================
  document.addEventListener('DOMContentLoaded', init);
})();
