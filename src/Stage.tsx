import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";

/***
 The type that this stage persists message-level state in.
 This is primarily for readability, and not enforced.

 @description This type is saved in the database after each message,
  which makes it ideal for storing things like positions and statuses,
  but not for things like history, which is best managed ephemerally
  in the internal state of the Stage class itself.
 ***/
type MessageStateType = any;

/***
 The type of the stage-specific configuration of this stage.

 @description This is for things you want people to be able to configure,
  like background color.
 ***/
type ConfigType = any;

/***
 The type that this stage persists chat initialization state in.
 If there is any 'constant once initialized' static state unique to a chat,
 like procedurally generated terrain that is only created ONCE and ONLY ONCE per chat,
 it belongs here.
 ***/
type InitStateType = any;

/***
 The type that this stage persists dynamic chat-level state in.
 This is for any state information unique to a chat,
    that applies to ALL branches and paths such as clearing fog-of-war.
 It is usually unlikely you will need this, and if it is used for message-level
    data like player health then it will enter an inconsistent state whenever
    they change branches or jump nodes. Use MessageStateType for that.
 ***/
type ChatStateType = any;

/***
 CHARACTER STATS STAGE - USAGE RULES & INSTRUCTIONS
 
 This stage displays comprehensive character statistics and should be used as follows:
 
 STAT USAGE RULES:
 1. All stats are stored in messageState and persist across the conversation
 2. Stats should be updated naturally through roleplay actions and events
 3. Gender-specific sections (vaginal/penile) display conditionally based on characterGender
 4. Fluid dynamics track real-time body fluid levels in mL
 
 AUTOMATIC STAT CALCULATION - ROBUST METHODOLOGY:
 Any stat marked as 'TBD' should be calculated using a hierarchical extraction approach:
 
 DATA SOURCES (Priority Order):
 1. USER PERSONA/CHAT PROFILE - Extract descriptive details about appearance, personality, background
 2. CHARACTER SCENARIO - Parse world info, setting details, character backstory
 3. CHAT HISTORY - Analyze mentioned physical descriptions, actions, and interactions
 4. EXISTING STATS - Use already-defined stats to calculate related unknown stats
 5. BIOLOGICAL NORMS - Apply realistic human physiology as baseline when no data exists
 
 STAT CALCULATION CORRELATIONS:
 Height → affects: canal depth, limb proportions, BMI calculation, clothing sizes
 Weight + Height → BMI → body type → affects: measurements, clothing fit, soft tissue mechanics
 Body Type → affects: bust/waist/hip ratios, fat distribution, muscle tone, clothing drape
 Age → affects: skin elasticity, tissue firmness, refractory period, hormonal profiles
 Gender → determines: genital anatomy, hormonal cycles, fat distribution patterns
 Bust/Waist/Hip → affects: bra size, clothing sizes, how garments fit and drape
 Body Type + Weight → affects: fabric tension, bunching areas, support needs, size adjustments
 
 EXTRACTION PATTERNS:
 - Physical descriptions: "tall", "petite", "curvy", "athletic", "soft", "lean", "full-figured"
 - Measurements: Look for cup sizes, numerical measurements (34C, 5'6", 140 lbs)
 - Clothing mentions: "tight jeans", "loose shirt", "struggles with buttons" → infer fit issues
 - Movement descriptions: "graceful", "heavy-set", "nimble" → infer body composition
 - Personality traits: confidence, shyness → may correlate with body awareness and clothing choices
 
 REALISTIC CALCULATION EXAMPLES:
 - If height=5'7" and weight=143 lbs and body_type="athletic" → 
   Calculate realistic bust/waist/hip (34-26-36"), estimate clothing sizes (tops: M, pants: 8-10)
 - If bust=38D and body_type="curvy" → 
   bra support="provides good lift, some spillage if too small", 
   tops_on_chest="snug, fabric stretches across bust"
 - If body_type="plus-size" and weight=210 lbs → 
   fabric_bunching="gathers at waist, under arms",
   clothing_gaps="may gap between buttons at chest"
 
 The AI MUST actively scan persona/scenario text for ANY relevant details and use them.
 Calculate interconnected stats as a web, not in isolation.
 
 MEASUREMENT & SIZING STANDARDS:
 - ALL measurements MUST use IMPERIAL units: inches (") for length/height, pounds (lbs) for weight
 - EXCEPTION: Volume measurements use milliliters (mL) for fluid tracking
 - ALL clothing sizes MUST use US sizing standards (S/M/L/XL, numeric pants sizes, US shoe sizes)
 - Examples: Height: 5'6", Weight: 140 lbs, Bust: 36", Waist: 28", Hips: 38"
 - Clothing: Tops (XS/S/M/L/XL/XXL or 0-24), Pants (0-24), Shoes (US 5-13), Bra (32A-44DDD)
 
 FORMATTING GUIDELINES:
 - Long-form descriptions use full field width
 - Numerical stats display with consistent spacing
 - Color-coded sections help organize information hierarchically
 
 @link https://github.com/CharHubAI/chub-stages-ts/blob/main/src/types/stage.ts
 ***/
export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {

    /***
     A very simple example internal state. Can be anything.
     This is ephemeral in the sense that it isn't persisted to a database,
     but exists as long as the instance does, i.e., the chat page is open.
     ***/
    myInternalState: {[key: string]: any};

    constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
        /***
         This is the first thing called in the stage,
         to create an instance of it.
         The definition of InitialData is at @link https://github.com/CharHubAI/chub-stages-ts/blob/main/src/types/initial.ts
         Character at @link https://github.com/CharHubAI/chub-stages-ts/blob/main/src/types/character.ts
         User at @link https://github.com/CharHubAI/chub-stages-ts/blob/main/src/types/user.ts
         ***/
        super(data);
        const {
            characters,         // @type:  { [key: string]: Character }
            users,                  // @type:  { [key: string]: User}
            config,                                 //  @type:  ConfigType
            messageState,                           //  @type:  MessageStateType
            environment,                     // @type: Environment (which is a string)
            initState,                             // @type: null | InitStateType
            chatState                              // @type: null | ChatStateType
        } = data;
        this.myInternalState = messageState != null ? messageState : {'someKey': 'someValue'};
        this.myInternalState['numUsers'] = Object.keys(users).length;
        this.myInternalState['numChars'] = Object.keys(characters).length;
        
        // Extract character info from user persona ({{user}})
        const activeUsers = Object.values(users).filter((user: any) => !user.isRemoved);
        if (activeUsers.length > 0) {
            const firstUser = activeUsers[0] as any;
            
            // Extract name from persona
            const nameMatch = firstUser.chatProfile?.match(/(?:my name is|i'm|i am)\s+([A-Z][a-z]+)/i);
            this.myInternalState['characterName'] = nameMatch ? nameMatch[1] : firstUser.name;
            
            // Extract age from persona
            const ageMatch = firstUser.chatProfile?.match(/(\d+)\s+years?\s+old/i);
            this.myInternalState['characterAge'] = ageMatch ? ageMatch[1] : 'Unknown';
            
            // Extract gender from persona
            const genderMatch = firstUser.chatProfile?.match(/(?:gender|sex|i am|i'm)\s*:?\s*(male|female|futanari|futa|hermaphrodite)/i);
            if (genderMatch) {
                const gender = genderMatch[1].toLowerCase();
                this.myInternalState['characterGender'] = (gender === 'futa' || gender === 'hermaphrodite') ? 'futanari' : gender;
            } else {
                // Default to female if not specified
                this.myInternalState['characterGender'] = messageState?.characterGender || 'female';
            }
        }
        
        // Initialize character stats
        this.myInternalState['stats'] = messageState?.stats || {
            health: 100,
            stamina: 100,
            strength: 10,
            intelligence: 10,
            charisma: 10,
            luck: 10
        };
        
        // SECTION 1: CORE BIOLOGY & PHYSICAL ANTHROPOMETRY
        this.myInternalState['bioProfile'] = messageState?.bioProfile || {
            height: 'TBD',
            weight: 'TBD',
            bodyType: 'TBD',
            skeletalPattern: 'TBD',
            posture: 'TBD',
            centerOfGravity: 'TBD',
            buildPersonality: 'TBD',
            visualPresence: 'TBD'
        };
        
        this.myInternalState['appearance'] = messageState?.appearance || {
            faceShape: 'TBD',
            hair: 'TBD',
            eyes: 'TBD',
            skinTone: 'TBD',
            bust: 'TBD',
            waist: 'TBD',
            hips: 'TBD',
            proportionNotes: 'TBD'
        };
        
        this.myInternalState['measurements'] = messageState?.measurements || {
            circumferences: { bust: 'TBD', waist: 'TBD', hips: 'TBD', thighUpper: 'TBD', calf: 'TBD', bicep: 'TBD' },
            verticals: { inseam: 'TBD', outseam: 'TBD', torsoFront: 'TBD', torsoBack: 'TBD' },
            crossSection: { chestWidthDepth: 'TBD', hipWidthDepth: 'TBD' }
        };
        
        this.myInternalState['skeletal'] = messageState?.skeletal || {
            spine: 'TBD',
            pelvis: 'TBD',
            functionalImplications: 'TBD'
        };
        
        this.myInternalState['musculature'] = messageState?.musculature || {
            muscleDistribution: 'TBD',
            tissueDensity: 'TBD',
            physiologicalImpact: 'TBD'
        };
        
        this.myInternalState['physiology'] = messageState?.physiology || {
            vitalCapacity: 'TBD',
            heartRateResting: 'TBD',
            heartRateArousal: 'TBD',
            bodyTemperature: 'TBD',
            gripStrength: 'TBD',
            bmr: 'TBD'
        };
        
        this.myInternalState['neurological'] = messageState?.neurological || {
            iqCognitiveStyle: 'TBD',
            agreeableness: 'TBD',
            assertiveness: 'TBD',
            conflictStyle: 'TBD',
            nurturingTraits: 'TBD'
        };
        
        // SECTION 2: POSTURE, MOVEMENT, & BIOMECHANICS
        this.myInternalState['posture'] = messageState?.posture || {
            standing: 'TBD',
            sitting: 'TBD',
            supine: 'TBD',
            flexionBending: 'TBD',
            quadruped: 'TBD',
            deepSquat: 'TBD'
        };
        
        // SECTION 3: SOFT TISSUE MECHANICS
        this.myInternalState['softTissue'] = messageState?.softTissue || {
            glutealMechanics: 'TBD',
            genitalFoldMechanics: 'TBD',
            breastMechanics: 'TBD',
            tactileExperience: 'TBD',
            underLoad: 'TBD'
        };
        
        // SECTION 4: SEXUAL PHYSIOLOGY & ORGASM TYPES
        this.myInternalState['vaginalPhysiology'] = messageState?.vaginalPhysiology || {
            canalLengthRelaxed: 'TBD',
            canalLengthElastic: 'TBD',
            girthCapacity: 'TBD',
            internalGeometry: 'TBD',
            engorgementLubrication: 'TBD',
            primaryPressureZones: 'TBD'
        };
        
        this.myInternalState['analPhysiology'] = messageState?.analPhysiology || {
            canalLengthRelaxed: 'TBD',
            canalLengthElastic: 'TBD',
            girthCapacity: 'TBD',
            internalGeometry: 'TBD',
            primaryPressureZones: 'TBD'
        };
        
        this.myInternalState['penilePhysiology'] = messageState?.penilePhysiology || {
            lengthFlaccid: 'TBD',
            lengthErect: 'TBD',
            girthBase: 'TBD',
            girthMid: 'TBD',
            girthTip: 'TBD',
            curvature: 'TBD',
            sensitivityZones: 'TBD',
            refractoryPeriod: 'TBD'
        };
        
        this.myInternalState['orgasmTypes'] = messageState?.orgasmTypes || {
            orgasmTypeA: 'TBD',
            orgasmTypeB: 'TBD',
            orgasmTypeC: 'TBD'
        };
        
        // SECTION 5: MULTIPLE ORGASM & CYCLE PHYSIOLOGY
        this.myInternalState['multipleOrgasm'] = messageState?.multipleOrgasm || {
            refractoryPeriod: 'TBD',
            wave1: 'TBD',
            wave2: 'TBD',
            wave3: 'TBD',
            subsequentWaves: 'TBD',
            afterglow: 'TBD'
        };
        
        // SECTION 6: POSITIONAL SENSATION MAPPING
        this.myInternalState['positional'] = messageState?.positional || {
            supine: 'TBD',
            prone: 'TBD',
            quadruped: 'TBD',
            archingPositions: 'TBD'
        };
        
        // SECTION 7: EMOTIONAL & COGNITIVE TRAITS
        this.myInternalState['emotional'] = messageState?.emotional || {
            hormonalCycleEffects: 'TBD',
            neurochemicalDrivers: 'TBD',
            cognitiveStateChanges: 'TBD',
            bondingStyle: 'TBD'
        };
        
        // FLUID DYNAMICS TRACKING
        this.myInternalState['fluidDynamics'] = messageState?.fluidDynamics || {
            oralCavity: '0 mL',
            stomach: '0 mL',
            smallIntestine: '0 mL',
            largeIntestine: '0 mL',
            vaginal: '0 mL',
            anal: '0 mL',
            bladder: '0 mL',
            totalIngested: '0 mL',
            lastIntakeTime: 'N/A',
            lastIntakeAmount: 'N/A'
        };
        
        // CLOTHING & WARDROBE
        this.myInternalState['clothingSizes'] = messageState?.clothingSizes || {
            tops: 'TBD',
            bottomsPants: 'TBD',
            bottomsSkirts: 'TBD',
            dresses: 'TBD',
            underwearBriefs: 'TBD',
            bra: 'TBD',
            shoes: 'TBD',
            socks: 'TBD',
            outerwear: 'TBD',
            gloves: 'TBD'
        };
        
        this.myInternalState['clothingFit'] = messageState?.clothingFit || {
            topsFit: 'TBD',
            pantsFit: 'TBD',
            skirtsFit: 'TBD',
            braFit: 'TBD',
            underwearFit: 'TBD',
            shoesFit: 'TBD',
            gapsAndBunching: 'TBD'
        };
        
        this.myInternalState['currentOutfit'] = messageState?.currentOutfit || {
            top: 'TBD',
            bottom: 'TBD',
            underwear: 'TBD',
            bra: 'TBD',
            shoes: 'TBD',
            accessories: 'TBD',
            overallStyle: 'TBD'
        };
        
        // SECTION 8: ADVANCED CHARACTER SYSTEMS
        this.myInternalState['advanced'] = messageState?.advanced || {
            sleepArchitecture: 'TBD',
            microexpressions: 'TBD',
            voiceProfile: 'TBD',
            fashionMobility: 'TBD',
            socialDynamics: 'TBD'
        };
        
        // Extract world time and date from scenario field
        const activeCharacters = Object.values(characters).filter((char: any) => !char.isRemoved && char.name);
        if (activeCharacters.length > 0) {
            const firstChar = activeCharacters[0] as any;
            const scenario = firstChar.scenario || '';
            
            // Extract date from scenario
            const dateMatch = scenario.match(/(?:current )?date:\s*([^.\n]+)/i);
            this.myInternalState['worldDate'] = dateMatch ? dateMatch[1].trim() : null;
            
            // Extract time from scenario
            const timeMatch = scenario.match(/(?:current )?time:\s*([^.\n]+)/i);
            this.myInternalState['worldTime'] = timeMatch ? timeMatch[1].trim() : null;
        }
        
        // Initialize previous state for tracking changes (store a deep copy)
        if (!this.myInternalState['previousState']) {
            this.myInternalState['previousState'] = JSON.parse(JSON.stringify(this.myInternalState));
        }
    }

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
        /***
         This is called immediately after the constructor, in case there is some asynchronous code you need to
         run on instantiation.
         ***/
        return {
            /*** @type boolean @default null
             @description The 'success' boolean returned should be false IFF (if and only if), some condition is met that means
              the stage shouldn't be run at all and the iFrame can be closed/removed.
              For example, if a stage displays expressions and no characters have an expression pack,
              there is no reason to run the stage, so it would return false here. ***/
            success: true,
            /*** @type null | string @description an error message to show
             briefly at the top of the screen, if any. ***/
            error: null,
            initState: null,
            chatState: null,
        };
    }

    async setState(state: MessageStateType): Promise<void> {
        /***
         This can be called at any time, typically after a jump to a different place in the chat tree
         or a swipe. Note how neither InitState nor ChatState are given here. They are not for
         state that is affected by swiping.
         ***/
        if (state != null) {
            this.myInternalState = {...this.myInternalState, ...state};
        }
    }

    async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        /***
         This is called after someone presses 'send', but before anything is sent to the LLM.
         ***/
        const {
            content,            /*** @type: string
             @description Just the last message about to be sent. ***/
            anonymizedId,       /*** @type: string
             @description An anonymized ID that is unique to this individual
              in this chat, but NOT their Chub ID. ***/
            isBot             /*** @type: boolean
             @description Whether this is itself from another bot, ex. in a group chat. ***/
        } = userMessage;
        return {
            /*** @type null | string @description A string to add to the
             end of the final prompt sent to the LLM,
             but that isn't persisted. ***/
            stageDirections: `\n[STATS] Calculate 'TBD' stats from persona/chat context. Extract physical data: height (ft/in), weight (lbs), measurements (in), age, gender. Correlate height+weight→body type→clothing sizes (US)→fit. Use imperial units (exception: mL for fluids). Update naturally during roleplay.`,
            /*** @type MessageStateType | null @description the new state after the userMessage. ***/
            messageState: {'someKey': this.myInternalState['someKey']},
            /*** @type null | string @description If not null, the user's message itself is replaced
             with this value, both in what's sent to the LLM and in the database. ***/
            modifiedMessage: null,
            /*** @type null | string @description A system message to append to the end of this message.
             This is unique in that it shows up in the chat log and is sent to the LLM in subsequent messages,
             but it's shown as coming from a system user and not any member of the chat. If you have things like
             computed stat blocks that you want to show in the log, but don't want the LLM to start trying to
             mimic/output them, they belong here. ***/
            systemMessage: null,
            /*** @type null | string @description an error message to show
             briefly at the top of the screen, if any. ***/
            error: null,
            chatState: null,
        };
    }

    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        /***
         This is called immediately after a response from the LLM.
         ***/
        const {
            content,            /*** @type: string
             @description The LLM's response. ***/
            anonymizedId,       /*** @type: string
             @description An anonymized ID that is unique to this individual
              in this chat, but NOT their Chub ID. ***/
            isBot             /*** @type: boolean
             @description Whether this is from a bot, conceivably always true. ***/
        } = botMessage;
        
        return {
            /*** @type null | string @description A string to add to the
             end of the final prompt sent to the LLM,
             but that isn't persisted. ***/
            stageDirections: null,
            /*** @type MessageStateType | null @description the new state after the botMessage. ***/
            messageState: {'someKey': this.myInternalState['someKey']},
            /*** @type null | string @description If not null, the bot's response itself is replaced
             with this value, both in what's sent to the LLM subsequently and in the database. ***/
            modifiedMessage: null,
            /*** @type null | string @description an error message to show
             briefly at the top of the screen, if any. ***/
            error: null,
            systemMessage: null,
            chatState: null
        };
    }


    renderFieldList(data: any, labels: {[key: string]: string}, longFields: string[] = [], isHeader: boolean = false): ReactElement {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2px, 0.6vw, 4px)', fontSize: 'clamp(11px, 2.5vw, 13px)' }}>
                {Object.entries(data || {}).map(([key, value]: [string, any]) => {
                    const label = labels[key] || key;
                    const isLong = longFields.includes(key);
                    
                    return (
                        <div key={key} style={{ 
                            padding: 'clamp(2px, 0.6vw, 3px) 0',
                            display: isLong ? 'block' : 'flex',
                            fontSize: isHeader ? 'clamp(13px, 2.9vw, 15px)' : 'clamp(11px, 2.5vw, 13px)'
                        }}>
                            <span style={{ fontWeight: isHeader ? 'bold' : '600', flexShrink: 0 }}>
                                {label}:
                            </span>
                            <span style={{ 
                                marginLeft: isLong ? '0' : 'clamp(8px, 2vw, 12px)', 
                                textAlign: isLong ? 'left' : 'left',
                                display: 'block',
                                marginTop: isLong ? 'clamp(2px, 0.5vw, 3px)' : '0',
                                opacity: value === 'TBD' ? 0.6 : 1
                            }}>{value}</span>
                        </div>
                    );
                })}
            </div>
        );
    }

    render(): ReactElement {
        /***
         There should be no "work" done here. Just returning the React element to display.
         If you're unfamiliar with React and prefer video, I've heard good things about
         @link https://scrimba.com/learn/learnreact but haven't personally watched/used it.

         For creating 3D and game components, react-three-fiber
           @link https://docs.pmnd.rs/react-three-fiber/getting-started/introduction
           and the associated ecosystem of libraries are quite good and intuitive.

         Cuberun is a good example of a game built with them.
           @link https://github.com/akarlsten/cuberun (Source)
           @link https://cuberun.adamkarlsten.com/ (Demo)
         ***/
        // Use world date/time from scenario if available, otherwise use system date/time
        let dateStr = this.myInternalState['worldDate'];
        let timeStr = this.myInternalState['worldTime'];
        
        if (!dateStr || !timeStr) {
            const now = new Date();
            if (!dateStr) {
                dateStr = now.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            }
            if (!timeStr) {
                timeStr = now.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            }
        }
        
        return <div style={{
            width: '100%',
            padding: '15px',
            fontFamily: 'sans-serif',
            fontSize: '14px'
        }}>
            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                Character Stats: {this.myInternalState['characterName'] || 'Unknown'} ({this.myInternalState['characterAge']}, {this.myInternalState['characterGender'] || 'Unknown'})
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
                Stats are being tracked in the background. This stage monitors all character attributes and updates them during roleplay.
            </div>
        </div>;
    }
}
