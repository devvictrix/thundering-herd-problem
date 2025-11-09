แน่นอนครับ นี่คือเนื้อหาทั้งหมดของไฟล์ `requirements/business.md` ฉบับล่าสุดที่ได้มีการอัปเดตตามที่เราคุยกันครับ

---

### **ไฟล์: `requirements/business.md` (ฉบับสมบูรณ์)**

การออกแบบระบบจองตั๋วคอนเสิร์ต BLACKPINK ถือเป็นหนึ่งในโจทย์ที่ท้าทายที่สุดในสายงานวิศวกรรมซอฟต์แวร์ครับ เพราะปัญหาหลักไม่ใช่แค่ "การจอง" แต่เป็น "การจองพร้อมกัน" (High Concurrency) ของคนจำนวนมหาศาลในเสี้ยววินาที หรือที่เรียกว่า **"Thundering Herd Problem"**

ระบบแบบเดิมๆ (Traditional Monolith) จะล่มภายในไม่กี่วินาทีครับ ดังนั้น เราต้องออกแบบสถาปัตยกรรมที่เน้นการกระจายโหลด (Distributed) และความยืดหยุ่น (Resilience)

นี่คือแนวทาง Tech Stack และสถาปัตยกรรมที่เหมาะสมสำหรับโจทย์นี้ครับ

---

### 🏛️ สถาปัตยกรรมหลัก: Microservices & Event-Driven

เราจะไม่สร้างเว็บเดียวที่ทำทุกอย่าง แต่จะซอยบริการย่อยๆ ออกจากกัน (Microservices) เพื่อให้สามารถขยาย (Scale) เฉพาะส่วนที่จำเป็นได้ เช่น ส่วนเลือกที่นั่งอาจจะต้องใช้ 1,000 instances แต่ส่วนจัดการ user อาจจะใช้แค่ 10 instances

บริการหลักๆ จะประกอบด้วย:
* **User Service:** จัดการข้อมูลสมาชิก, Login
* **Event Service:** แสดงข้อมูลคอนเสิร์ต, ผังที่นั่ง (มักจะเป็น Static)
* **Queue Service (The Waiting Room):** **ส่วนที่สำคัญที่สุด** ในการกันไม่ให้ระบบล่ม
* **Booking Service (Hotspot):** บริการที่ "ร้อนแรง" ที่สุด ทำหน้าที่จอง/ล็อคที่นั่ง
* **Payment Service:** เชื่อมต่อ Payment Gateway
* **Notification Service:** ส่ง Email/SMS ยืนยัน

---

### 💻 Recommended Tech Stack (แยกตามส่วน)

#### 1. The "Waiting Room" (ห้องรับรองเสมือน)

นี่คือด่านหน้าสุด ห้ามล่มเด็ดขาด เราไม่สามารถให้คน 1,000,000 คนเข้ามากดเลือกที่นั่งพร้อมกันได้

*   **แนวคิด:** สร้าง "ห้องรอ" ให้กับ user ที่เข้ามาก่อนเวลา และจัดลำดับคิว (FIFO หรือ สุ่ม) เพื่อทยอยปล่อยคนเข้าไปจองจริง
*   **Tech:**
    *   **Managed Service (แนะนำ):** **Cloudflare Waiting Room** หรือ **AWS Virtual Waiting Room** นี่คือวิธีที่ง่ายและมีประสิทธิภาพที่สุดครับ เราไม่ต้องสร้างเอง
    *   **Build-it-Yourself:** ใช้ **Redis** (สำหรับจัดการคิว) + **NGINX/Gateway** (สำหรับควบคุมการปล่อย Traffic)

#### 2. Frontend (หน้าบ้าน)

ต้องเร็ว, โหลดน้อย, และอัปเดตสถานะที่นั่งแบบ Real-time

*   **Framework:** **React.js (Next.js)** หรือ **Vue.js (Nuxt.js)**
*   **Why Next.js/Nuxt.js:** สามารถใช้ SSG (Static Site Generation) สร้างหน้าข้อมูลคอนเสิร์ต/ผังที่นั่งไว้ล่วงหน้า แล้วไปวางบน **CDN (Cloudflare / CloudFront)** เพื่อลดภาระเซิร์ฟเวอร์หลักให้เป็นศูนย์
*   **Real-time:** ใช้ **WebSockets** หรือ **Server-Sent Events (SSE)** เพื่ออัปเดตสถานะที่นั่ง (เช่น ที่นั่งนี้ถูกคนอื่นเลือกไปแล้ว) โดยไม่ต้องให้ user กด refresh

#### 3. Backend (Microservices)

ส่วนนี้ต้องการภาษาที่จัดการ Concurrency ได้ดีมาก แต่สิ่งสำคัญกว่าคือ "สถาปัตยกรรม" ที่รองรับการ Scale

##### **Booking Service (Hotspot):**
*   **Node.js (Fastify/NestJS):** **เป็นตัวเลือกที่มีประสิทธิภาพสูง** เมื่อใช้ร่วมกับสถาปัตยกรรมที่ถูกต้อง แม้ว่า Node.js จะเป็น Single-threaded แต่เราจะแก้ปัญหา "Thundering Herd" ด้วยการทำ Horizontal Scaling ที่ระดับ Infrastructure (การเพิ่มจำนวน Pods) ซึ่งเป็นแนวทางที่ทันสมัยและพิสูจน์แล้วว่าสามารถรองรับโหลดมหาศาลได้จริง
*   **Go (Golang):** ยังคงเป็นตัวเลือกที่ยอดเยี่ยม โดยเฉพาะสำหรับงานที่ต้องใช้ CPU หนักๆ (CPU-bound) เพราะจัดการ Concurrency ผ่าน Goroutines ในระดับ Process ได้อย่างมีประสิทธิภาพสูงสุด แต่สำหรับ Prototype นี้ เราจะพิสูจน์ว่า Node.js ก็สามารถทำได้ดีเยี่ยมเช่นกัน

> #### **Node.js Concurrency และ Pod Scaling**
>
> Pain point ดั้งเดิมของ Node.js คือการทำงานบน CPU core เดียว ทำให้ไม่สามารถใช้ประโยชน์จากเครื่องที่มีหลาย core ได้เต็มที่ วิธีแก้ในอดีตคือการใช้ `cluster` module เพื่อแตก process ภายในเครื่องเดียว
>
> **ในสถาปัตยกรรมของเรา เราจะไม่ใช้ `cluster` module ครับ**
>
> แต่เราจะแก้ปัญหานี้ที่ **ระดับ Infrastructure** โดยการรันแอปพลิเคชัน Node.js แบบ Single-threaded ที่เรียบง่ายใน Container ขนาดเล็ก (เช่น 1 CPU core) แล้วทำการ **Scale Out** หรือเพิ่มจำนวนสำเนาของ Container (Pods) ขึ้นเป็นร้อยเป็นพันตัว วิธีนี้ทำให้เราได้ **True Concurrency** ในระดับ System และยังได้ความทนทาน (Resilience) ที่สูงกว่ามาก
>
> **สรุป:** Pain point ของ Node.js's single-threaded event loop ถูกแก้ปัญหาที่ระดับ Infrastructure (Docker/Kubernetes) ทำให้เราสามารถเขียนโค้ดที่เรียบง่ายและดูแลรักษาง่ายได้ โดยไม่ต้องกังวลเรื่องการจัดการ Multi-core ในโค้ดแอปพลิเคชัน

#### 4. Databases (คอขวดที่แท้จริง)

นี่คือหัวใจของการจองตั๋ว เราไม่สามารถใช้ SQL Database ธรรมดามาจัดการ "สต็อกที่นั่ง" ได้ เพราะการ Lock Row จะทำให้ระบบค้างทันที

*   **Database (สำหรับเก็บข้อมูลหลัก):** **PostgreSQL** หรือ **MySQL**
    *   ใช้เก็บข้อมูล User, ข้อมูลคอนเสิร์ต, และ **Orders ที่จ่ายเงินสำเร็จแล้ว** (ข้อมูลที่นิ่งแล้ว)
*   **In-Memory Database (สำหรับจัดการสต็อกที่นั่ง):** **Redis**
    *   **นี่คือพระเอกครับ** เราจะเก็บสถานะของที่นั่งทั้งหมด (เช่น `SEAT:A1`, `SEAT:A2`) ไว้ใน Redis
    *   เมื่อ User เลือกที่นั่ง ระบบจะใช้คำสั่ง Atomic ของ Redis (เช่น `SETEX seat:A1 "user_id_123" 600`) เพื่อ "จอง" ที่นั่งนั้นไว้ 10 นาที (Status: PENDING)
    *   วิธีนี้เร็วกว่า SQL หลายพันเท่า เพราะทำใน Memory และไม่มีการ Lock Table

#### 5. Asynchronous Processing (การสื่อสารระหว่าง Services)

เมื่อ User จ่ายเงินสำเร็จ เราไม่ควรรอให้ระบบส่ง Email ก่อนค่อยบอกว่าจองสำเร็จ แต่เราจะใช้ Message Queue

*   **Tech:** **Apache Kafka** (สำหรับงานสเกลใหญ่มาก) หรือ **RabbitMQ**
*   **Flow:**
    1.  `Payment Service` ได้รับการยืนยันว่าจ่ายเงินสำเร็จ
    2.  `Payment Service` ยิง Event ชื่อ `ORDER_PAID` เข้าไปใน **Kafka**
    3.  `Booking Service` (ไปอัปเดตสถานะใน Redis/PostgreSQL ว่าเป็น SOLD) และ `Notification Service` (ไปส่ง Email) ค่อยมาดึงงานนี้ไปทำทีหลัง
    4.  User ได้รับการยืนยันทันทีว่า "จองสำเร็จ" โดยไม่ต้องรอ Email

#### 6. Infrastructure & DevOps (รากฐาน)

ระบบทั้งหมดต้องขยายตัวได้อัตโนมัติ

*   **Cloud:** **AWS** หรือ **GCP**
*   **Containerization:** **Docker**
*   **Orchestration:** **Kubernetes (K8s)** (เช่น GKE หรือ EKS)
*   **Key Feature:** **Horizontal Pod Autoscaler (HPA)**
    *   เราจะตั้งค่า K8s ไว้ว่า "ถ้า CPU ของ Booking Service วิ่งเกิน 80% ให้เพิ่มจำนวน Pod (Instance) ขึ้นอัตโนมัติ"
    *   เมื่อถึงเวลา 10 โมงเช้า ระบบจะขยายตัวจาก 5 Pods ไปเป็น 500 Pods เพื่อรับโหลด และเมื่อคนเริ่มซา มันจะลดขนาดกลับลงมาเองเพื่อประหยัดค่าใช้จ่าย

---

### 🔄 สรุป Flow การจอง (ฉบับย่อ)

1.  10:00 น. User 1 ล้านคนกดเข้าเว็บ
2.  **Cloudflare Waiting Room** (ด่านหน้า) ตีคนส่วนใหญ่ไป "รอ"
3.  Waiting Room ทยอยปล่อยคนเข้าเว็บทีละ 10,000 คน
4.  User โหลดหน้าเว็บ (Static files จาก **CDN**)
5.  User กดเลือกที่นั่ง A1 -> Request ยิงไปที่ **Go Booking Service**
6.  Go Service เช็คใน **Redis** ว่า `SEAT:A1` ว่างหรือไม่
7.  ถ้าว่าง สั่ง `SETEX SEAT:A1 "HELD"` ใน **Redis** (ล็อค 10 นาที)
8.  User เข้าสู่หน้าจ่ายเงิน -> ยิงไปที่ **Payment Service**
9.  จ่ายเงินสำเร็จ -> Payment Service ยิง Event `ORDER_PAID` เข้า **Kafka**
10. ระบบ (ที่เชื่อมกับ Kafka) ส่ง Email และอัปเดต **PostgreSQL** ว่า A1 ขายแล้ว
11. User เห็นหน้าจอ "จองสำเร็จ"

กุญแจสำคัญไม่ใช่แค่ภาษาโปรแกรมมิ่ง แต่เป็นสถาปัตยกรรมที่ออกแบบมาเพื่อ "กันกระแทก" และ "กระจายงาน" โดยเฉพาะครับ

---

คุณอยากให้ผมเจาะลึกส่วนไหนเป็นพิเศษไหมครับ เช่น การออกแบบ Database Schema ใน Redis สำหรับจัดการที่นั่ง หรือ Flow ของ Waiting Room ครับ